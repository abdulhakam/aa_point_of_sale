//! Spool: run a query in SQLite, keep the rows out of QuickJS, and hand the renderer an address.
//!
//! The problem this solves. `sqlite.all` returns every row *into* QuickJS, and the only bridge
//! TrailBase offers is `Vec<Vec<Value>>` — positional, no column names. So the host has to
//! serialise the whole result to a JSON string (`api/sqlite.rs`) and QuickJS has to re-parse it,
//! and the app then loops over it in an interpreter that manages ~1e6 ops/s. On report-sized data
//! (60k+ rows) that transport, not SQL, is the cost.
//!
//! The contract here is "an address, not a value":
//!
//!   1. `spool::run` executes the statement, converts each row to JSONL in Rust, writes the bytes
//!      to the KV store, and returns `{ key, rows, bytes, queryMs, writeMs }` — a small object.
//!   2. `render::spooled` reads those keys back and splices them into the minijinja context
//!      **in Rust**. The template then iterates rows that never existed in QuickJS.
//!
//! JS's whole involvement is composing a SQL string and holding a key.
//!
//! JSONL, not one JSON array: it is written and read incrementally, so a large result never needs
//! a second full-size buffer, and a caller can count rows without parsing values.
//!
//! Column names are a *contract*, not a discovery. `trailbase_wasm::db::query` returns bare
//! `Vec<Vec<Value>>` with no metadata, so the caller supplies the names positionally and they are
//! asserted against the row width. A mismatch is a loud error, never a silently mislabelled row —
//! the same pattern `tb-ah-query-tbdb` uses for its `PAYLOAD_COLS` table.

use std::time::Instant;

use serde_json::{Map, Value as J};
use trailbase_wasm::db::{query, Value};

use crate::api::value_to_json;

/// Prefix for every spool key. Namespaced so a spool entry can never collide with an app cache
/// entry in the shared KV store (`reports.js` caches under `rpt:`).
const PREFIX: &str = "spool:";

/// What the caller gets back: an address plus enough counters to attribute a slow report.
///
/// `rename_all = "camelCase"` because the consumer is JS, and the whole point of the handle is
/// that it is read in a route where a missing counter is a silent hole in the timing.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Handle {
  pub key: String,
  pub rows: usize,
  pub bytes: usize,
  pub query_ms: u128,
  pub write_ms: u128,
}

fn spool_key(name: &str, seq: u64) -> String {
  format!("{PREFIX}{name}:{seq}")
}

/// Monotonic per-process counter, so two spools in one request never collide.
fn next_seq() -> u64 {
  static SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
  SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
}

/// Decode a bind parameter.
///
/// Ids in this schema are BLOB uuid_v7, and the host's own convention for a BLOB crossing into JS
/// is padded URL-safe base64 (`api::value_to_json`). So a JS caller can only ever hold an id as
/// base64 — binding it as `Value::Text` would compare TEXT against BLOB and never match, silently
/// filtering every row away. `blob:` is therefore an explicit, unambiguous escape hatch.
///
/// Bare strings stay `Value::Text`, which is what every existing call site in this host expects
/// (`api/sqlite.rs`, `api.rs`), so nothing else changes behaviour.
fn bind_param(s: &str) -> Result<Value, String> {
  let Some(encoded) = s.strip_prefix("blob:") else {
    return Ok(Value::Text(s.to_string()));
  };
  use base64::Engine as _;
  let bytes = base64::engine::general_purpose::URL_SAFE
    .decode(encoded)
    .map_err(|e| format!("blob: parameter is not valid URL-safe base64: {e}"))?;
  return Ok(Value::Blob(bytes));
}

/// One row as a JSON object, built from the positional values and the column manifest.
///
/// `zip` stops at the shorter side, so a short row is caught by the width assertion in `run`
/// rather than silently producing a partial object.
fn row_to_json(cols: &[String], row: &[Value]) -> J {
  let mut obj = Map::with_capacity(cols.len());
  for (name, value) in cols.iter().zip(row.iter()) {
    obj.insert(name.clone(), value_to_json(value.clone()));
  }
  return J::Object(obj);
}

/// Run `sql`, spool the rows under `name`, and return the handle.
///
/// `cols` must be the statement's SELECT list in order. Bind values are `Value::Text`, except a
/// `blob:`-prefixed one which is decoded to `Value::Blob` — see `bind_param`.
pub async fn run(name: &str, sql: &str, cols: &[String], params: Vec<String>) -> Result<Handle, String> {
  let t_query = Instant::now();
  let mut bind = Vec::with_capacity(params.len());
  for p in &params {
    bind.push(bind_param(p)?);
  }
  let rows = query(sql.to_string(), bind)
    .await
    .map_err(|e| format!("query failed: {e:?}"))?;
  let query_ms = t_query.elapsed().as_millis();

  // A width mismatch means the column manifest has drifted from the statement. Every row is
  // checked because SQLite pads short rows with NULL and returns wide rows intact, so only the
  // first row is not enough.
  for (i, row) in rows.iter().enumerate() {
    if row.len() != cols.len() {
      return Err(format!(
        "column manifest mismatch on spool '{name}': statement returned {} value(s) at row {i}, manifest names {} ({})",
        row.len(),
        cols.len(),
        cols.join(", ")
      ));
    }
  }

  let t_write = Instant::now();
  let mut out = String::with_capacity(rows.len() * 96);
  for row in &rows {
    out.push_str(&serde_json::to_string(&row_to_json(cols, row)).map_err(|e| format!("serialise failed: {e}"))?);
    out.push('\n');
  }

  let key = spool_key(name, next_seq());
  let mut store = trailbase_wasm::kv::Store::open().map_err(|e| format!("kv open failed: {e}"))?;
  store.set(&key, out.as_bytes()).map_err(|e| format!("kv set failed: {e}"))?;
  let write_ms = t_write.elapsed().as_millis();

  return Ok(Handle {
    key,
    rows: rows.len(),
    bytes: out.len(),
    query_ms,
    write_ms,
  });
}

/// Read a spool key back as a JSON array of row objects, for splicing into a render context.
pub fn load(key: &str) -> Result<J, String> {
  let store = trailbase_wasm::kv::Store::open().map_err(|e| format!("kv open failed: {e}"))?;
  let bytes = store.get(key).map_err(|e| format!("kv get failed: {e}"))?;  let Some(bytes) = bytes else {
    return Err(format!("no spool at key: {key}"));
  };
  let text = String::from_utf8(bytes).map_err(|e| format!("spool is not utf-8: {e}"))?;

  let mut out = Vec::new();
  for line in text.lines().filter(|l| !l.trim().is_empty()) {
    out.push(serde_json::from_str(line).map_err(|e| format!("spool line is not JSON: {e}"))?);
  }
  return Ok(J::Array(out));
}

/// Drop a spool key once its render is done, so a long-lived depot does not accumulate rows.
pub fn release(key: &str) {
  if let Ok(mut store) = trailbase_wasm::kv::Store::open() {
    let _ = store.delete(key);
  }
}
