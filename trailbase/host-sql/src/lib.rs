//! `sql.wasm` — a standalone TrailBase guest component that serves *data acquisition only*.
//!
//! Purpose: measure what it actually costs to run SQL in a **separate wasm component** instead of
//! in the main app host. It owns a disjoint URL space (`/rpc/*`) because TrailBase merges every
//! component's handlers into one flat axum router — see
//! `vault/issues/trailbase-loads-multiple-components-flat-router.md`.
//!
//! The contract is deliberately "a name, not a value": it runs a named query, writes the rows to a
//! spool file under the WASI runtime root, and answers with a handle
//! `{ path, rows, bytes, queryMs, totalMs }`. The caller renders from `path`; the rows never pass
//! through this response.
//!
//! This component is experimental and exists to produce a measurement, not to be a shipped
//! service.

use std::time::Instant;

use trailbase_wasm::db::{Value, query};
use trailbase_wasm::http::{HttpError, HttpRoute, IntoResponse, Request, Response, StatusCode, routing};
use trailbase_wasm::{Guest, export};

struct Endpoints;

/// The only query this component serves, with its column names bound explicitly: `db::query`
/// returns bare `Vec<Vec<Value>>` with no column metadata, so a name-per-query table is the
/// contract. A real registry would read names from the statement or a manifest.
const PAYLOAD_SQL: &str = r#"
SELECT p."amount", p."paid", p."payment_date", p."description", t."qty", t."price", t."discount_rs"
FROM payments p
LEFT JOIN transactions t ON t."id" = p."invoice"
ORDER BY p."id" DESC
LIMIT ?
"#;

const PAYLOAD_COLS: [&str; 7] = [
  "amount",
  "paid",
  "payment_date",
  "description",
  "qty",
  "price",
  "discount_rs",
];

fn value_to_json(v: &Value) -> serde_json::Value {
  match v {
    Value::Null => serde_json::Value::Null,
    Value::Integer(i) => serde_json::Value::from(*i),
    Value::Real(f) => serde_json::Value::from(*f),
    Value::Text(s) => serde_json::Value::String(s.clone()),
    Value::Blob(b) => serde_json::Value::String(format!("<{} bytes>", b.len())),
  }
}

impl Guest for Endpoints {
  fn http_handlers() -> Vec<HttpRoute> {
    // NOTE: no `/{*wildcard}` here. The main host already claims the wildcard, and TrailBase
    // panics at startup on an overlapping method route, so this component's URL space must stay
    // strictly disjoint from every other component's.
    return vec![
      routing::get("/rpc/payload", payload_handler),
      // Whole-table acquisition, so the all-reports sweep can serve each report's base tables
      // from this component. Mirrors `app/lib/data.js readTable`: all columns, `ORDER BY "id" DESC`.
      routing::get("/rpc/table", table_handler),
    ];
  }
}

/// Table names are interpolated into SQL, so they are validated to a strict identifier shape first.
/// This is the only place in this component where SQL is built from a request parameter.
fn is_identifier(s: &str) -> bool {
  let mut chars = s.chars();
  match chars.next() {
    Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
    _ => return false,
  }
  chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Cold mode is **not implementable from inside the guest.**
///
/// The obvious lever would be `PRAGMA shrink_memory; PRAGMA cache_size = 1;` before the measured
/// query. TrailBase's DB bridge rejects every PRAGMA — "pragmas not supported" — through both
/// `query` and `execute`, so those calls only ever produced a swallowed error. An earlier revision
/// of this benchmark called them and labelled the result "cold"; it was a no-op and the numbers
/// were warm. The only genuine way to a cold SQLite page cache is a fresh process, which the
/// benchmark now does by restarting the server between measurements (`tools/run-bench.ps1
/// -ColdRestart`) rather than pretending a PRAGMA did it.
async fn cold_flush(cold: bool) {
  if cold {
    // Deliberately empty: see the note above. Kept so call sites read the same and the absence is
    // not mistaken for an oversight.
  }
}

/// Column names for a table.
///
/// NOTE: `PRAGMA table_info(...)` is **not available** — TrailBase's DB bridge rejects every PRAGMA
/// with "pragmas not supported", through both `query` and `execute`. So the column list is parsed
/// out of the `CREATE TABLE` statement in `sqlite_master` instead. The schema is generated and
/// regular (one quoted column name per top-level comma-separated definition), so the parse is
/// narrow: strip the outer parens, split on top-level commas, take the first token of each part,
/// and drop the table-constraint clauses.
fn columns_from_ddl(sql: &str) -> Vec<String> {
  let (Some(open), Some(close)) = (sql.find('('), sql.rfind(')')) else {
    return vec![];
  };
  if close <= open {
    return vec![];
  }
  let body = &sql[open + 1..close];

  let mut parts: Vec<String> = vec![];
  let mut depth = 0i32;
  let mut cur = String::new();
  for ch in body.chars() {
    match ch {
      '(' => {
        depth += 1;
        cur.push(ch);
      }
      ')' => {
        depth -= 1;
        cur.push(ch);
      }
      ',' if depth == 0 => parts.push(std::mem::take(&mut cur)),
      _ => cur.push(ch),
    }
  }
  parts.push(cur);

  parts
    .iter()
    .filter_map(|part| {
      let first = part.trim().split_whitespace().next()?.to_ascii_uppercase();
      if matches!(
        first.as_str(),
        "PRIMARY" | "UNIQUE" | "FOREIGN" | "CHECK" | "CONSTRAINT"
      ) {
        return None;
      }
      Some(first.trim_matches('"').to_string())
    })
    .collect()
}

/// Rows -> JSONL. Shared by both handlers: this is the cost a component boundary cannot avoid, and
/// it is deliberately done in Rust rather than by materialising values in QuickJS.
fn rows_to_jsonl(rows: &[Vec<Value>], cols: &[String]) -> String {
  let mut out = String::with_capacity(rows.len() * 96);
  for row in rows {
    let obj: Vec<(String, serde_json::Value)> = cols
      .iter()
      .zip(row.iter())
      .map(|(name, v)| (name.clone(), value_to_json(v)))
      .collect();
    out.push_str(
      &serde_json::to_string(&serde_json::Value::Object(obj.into_iter().collect())).unwrap_or_default(),
    );
    out.push('\n');
  }
  out
}

fn spool_key(kind: &str) -> String {
  static SPOOL_SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
  let seq = SPOOL_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
  format!("sql-spool:{kind}:{seq}")
}

fn spool(store_out: String, rows: usize, query_ms: u128, write_ms: u128, total_ms: u128, key: String) -> Result<Response, HttpError> {
  let body = serde_json::json!({
    "key": key,
    "rows": rows,
    "bytes": store_out.len(),
    "queryMs": query_ms,
    "writeMs": write_ms,
    "totalMs": total_ms,
  });
  let payload = serde_json::to_string(&body).unwrap_or_else(|e| format!("{{\"error\":\"{e}\"}}"));
  return Ok(payload.into_response());
}

async fn table_handler(req: Request) -> Result<Response, HttpError> {
  let t_start = Instant::now();

  let name = req.query_param("name").unwrap_or_default();
  if !is_identifier(&name) {
    return Err(HttpError::message(StatusCode::BAD_REQUEST, "bad table name"));
  }

  // Column names come from the table's own DDL, so the payload has the same shape as `readTable`.
  let ddl_rows = query(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
    vec![Value::Text(name.clone())],
  )
  .await
  .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("ddl lookup failed: {e:?}")))?;
  let ddl = match ddl_rows.first().and_then(|r| r.first()) {
    Some(Value::Text(s)) => s.clone(),
    _ => return Err(HttpError::message(StatusCode::NOT_FOUND, format!("unknown table: {name}"))),
  };
  let cols = columns_from_ddl(&ddl);
  if cols.is_empty() {
    return Err(HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("no columns parsed for {name}")));
  }

  let select = cols.iter().map(|c| format!("\"{c}\"")).collect::<Vec<_>>().join(", ");
  let sql = format!("SELECT {select} FROM \"{name}\" ORDER BY \"id\" DESC");
  let rows = query(&sql, vec![])
    .await
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("query failed: {e:?}")))?;
  let query_ms = t_start.elapsed().as_millis();

  let t_write = Instant::now();
  let out = rows_to_jsonl(&rows, &cols);

  let key = spool_key("table");
  let mut store = trailbase_wasm::kv::Store::open()
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("kv open failed: {e}")))?;
  store
    .set(&key, out.as_bytes())
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("kv set failed: {e}")))?;
  let write_ms = t_write.elapsed().as_millis();

  return spool(out, rows.len(), query_ms, write_ms, t_start.elapsed().as_millis(), key);
}

async fn payload_handler(req: Request) -> Result<Response, HttpError> {
  let t_start = Instant::now();

  // `limit` is the row count to acquire. Bounded so the component call stays inside the ~20 s
  // guest deadline, which is a per-call limit for every component in the process.
  let limit: i64 = req
    .query_param("limit")
    .and_then(|v| v.parse().ok())
    .unwrap_or(2000)
    .clamp(1, 50_000);

  // Cold mode (`?cold=1`): drop this connection's SQLite page cache and shrink its cache target
  // before measuring, so the SELECT below reads pages rather than serving them from cache.
  //
  // This is the only cache lever the guest actually has. It defeats *SQLite's* page cache, not the
  // operating system's filesystem cache — those pages are still resident in the kernel after the
  // first read and cannot be dropped from inside WASI. So `cold=1` means "SQLite-cold", which is
  // the honest label for it.
  let cold = req.query_param("cold").map(|v| v == "1").unwrap_or(false);
  cold_flush(cold).await;

  let rows = query(PAYLOAD_SQL, vec![Value::Integer(limit)])
    .await
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("query failed: {e:?}")))?;
  let query_ms = t_start.elapsed().as_millis();

  // Serialise to JSONL. This is the cost a component boundary cannot avoid: the rows have to become
  // bytes somewhere before another component can read them.
  let t_write = Instant::now();
  let cols: Vec<String> = PAYLOAD_COLS.iter().map(|c| c.to_string()).collect();
  let out = rows_to_jsonl(&rows, &cols);

  // Hand off by *name*. The WASI runtime root is mounted read-only (a write there fails with
  // `Operation not permitted (os error 63)`), so a spool file under `/app` is not available. The
  // TrailBase KV store is reachable from *every* component, which makes it the shared-addressable
  // handoff that "pass an address, not a value" actually needs: the response carries a key, and the
  // caller reads the bytes by that key and then deletes it.
  let key = spool_key("payload");
  let mut store = trailbase_wasm::kv::Store::open()
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("kv open failed: {e}")))?;
  store
    .set(&key, out.as_bytes())
    .map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, format!("kv set failed: {e}")))?;
  let write_ms = t_write.elapsed().as_millis();

  return spool(out, rows.len(), query_ms, write_ms, t_start.elapsed().as_millis(), key);
}

export!(Endpoints);
