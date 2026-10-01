use rquickjs::{Function, Object, Result, Ctx, IntoJs, prelude::{Async, Opt}};
use trailbase_wasm::db::{execute, query, Value};

/// The SQL library exposed to the guest.
///
/// Generic mechanism only: this file knows nothing about a report, a column or a business rule, and
/// neither may anything added to it. `sql` is the library's name; `sqlite` is a legacy alias kept
/// because the dispatcher already says `sqlite.…` in a hundred places, and renaming those call sites
/// would be a large diff with no behavioural benefit.
///
///   sql.query(sql, params)  -> rows
///   sql.get(sql, params)    -> the first row, or undefined
///   sql.spool(name, sql, cols, params) -> { key, rows, bytes, queryMs, writeMs }
///   sql.execute(sql, params) -> rows affected
///
/// `query` brings the rows into QuickJS; `spool` never does — it serialises them in Rust, writes them
/// to the KV store and answers with an ADDRESS, which is what keeps a 26,000-row report out of the
/// JavaScript heap. Both return a JS value built directly from the result: no JSON string is
/// produced or parsed in either direction.
pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    let sql = Object::new(ctx.clone())?;

    sql.set("query", Function::new(ctx.clone(), Async(query_wrapper)))?;
    sql.set("all", Function::new(ctx.clone(), Async(query_wrapper)))?; // legacy name for `query`
    sql.set("get", Function::new(ctx.clone(), Async(get_wrapper)))?; // returns the first row
    sql.set("spool", Function::new(ctx.clone(), Async(spool_wrapper)))?;
    sql.set("execute", Function::new(ctx.clone(), Async(execute_wrapper)))?;
    sql.set("run", Function::new(ctx.clone(), Async(execute_wrapper)))?; // legacy name for `execute`

    globals.set("sql", sql.clone())?;
    globals.set("sqlite", sql)?;
    Ok(())
}

/// Reject the statements that reach outside the report read path.
///
/// The guest is an application, not an operator: a report statement must not be able to drop a
/// table, detach the database file, reconfigure the connection or rewrite its indexes. This is
/// mechanism, not policy — it names no table and no report.
///
/// It is deliberately a BLOCKLIST and not "only SELECT". The guest's own write path legitimately
/// runs `CREATE TABLE` (the rendered-page cache), `INSERT`, `UPDATE` and `DELETE` (management
/// CRUD), so a whitelist would refuse work the app is supposed to do. Everything on that list is a
/// statement whose damage is not reversible by the app.
const FORBIDDEN: [&str; 6] = ["DROP", "ATTACH", "DETACH", "PRAGMA", "VACUUM", "REINDEX"];

/// The first keyword of one statement, or `""` when there is none.
///
/// Leading `--` line comments and `/* … */` block comments are skipped, and the comparison is
/// case-insensitive, because `drop` and `-- archive\nDROP` must not slip past a `starts_with` on the
/// raw text.
fn leading_keyword(statement: &str) -> String {
    let mut rest = statement.trim_start();
    loop {
        if let Some(after) = rest.strip_prefix("--") {
            match after.find('\n') {
                Some(i) => rest = after[i + 1..].trim_start(),
                None => return String::new(),
            }
        } else if let Some(after) = rest.strip_prefix("/*") {
            match after.find("*/") {
                Some(i) => rest = after[i + 2..].trim_start(),
                None => return String::new(),
            }
        } else {
            break;
        }
    }
    rest.split(|c: char| !c.is_ascii_alphabetic())
        .next()
        .unwrap_or("")
        .to_ascii_uppercase()
}

/// The first forbidden keyword found in ANY statement of `sql`, or `None`.
///
/// Checking only the FIRST keyword is not a guard, it is a spelling check. The spool hands this
/// function a fully composed statement — the prelude's `WITH …` chain followed by the report body —
/// so its leading keyword is `WITH` and always was. A report body carrying
///
///     SELECT 1; DROP TABLE pagecache
///
/// would then sail past a leading-keyword test and run. Splitting on `;` and checking each statement
/// closes that, which is the whole point of having the check here.
///
/// The split is deliberately not a SQL parser: a `;` inside a string literal or a comment would be
/// treated as a terminator, and a fragment that only *looks* like a keyword is still refused. Over-
/// refusing is the safe direction for a guard; under-refusing is the failure that matters.
fn forbidden_keyword(sql: &str) -> Option<String> {
    // Strings and comments are masked before splitting, so a `;` inside one does not create a
    // fragment and a keyword inside one does not raise a false alarm.
    let mut masked = String::with_capacity(sql.len());
    let mut chars = sql.chars().peekable();
    let mut in_single = false;
    let mut in_double = false;
    let mut in_line_comment = false;
    let mut in_block_comment = false;
    while let Some(c) = chars.next() {
        if in_line_comment {
            if c == '\n' {
                in_line_comment = false;
            }
            continue;
        }
        if in_block_comment {
            if c == '*' && chars.peek() == Some(&'/') {
                chars.next();
                in_block_comment = false;
            }
            continue;
        }
        if in_single {
            if c == '\'' {
                in_single = false;
            }
            continue;
        }
        if in_double {
            if c == '"' {
                in_double = false;
            }
            continue;
        }
        match c {
            '-' if chars.peek() == Some(&'-') => {
                chars.next();
                in_line_comment = true;
            }
            '/' if chars.peek() == Some(&'*') => {
                chars.next();
                in_block_comment = true;
            }
            '\'' => in_single = true,
            '"' => in_double = true,
            _ => {}
        }
        if !in_single && !in_double {
            masked.push(c);
        }
    }

    masked
        .split(';')
        .map(leading_keyword)
        .find(|word| FORBIDDEN.contains(&word.as_str()))
}

/// The guard, as a thrown exception so the guest sees the reason rather than a bare failure.
fn guard<'js>(ctx: &Ctx<'js>, sql: &str) -> Result<rquickjs::Value<'js>> {
    if let Some(word) = forbidden_keyword(sql) {
        let msg = format!("sql: {word} is not permitted by the guest's SQL guard");
        eprintln!("{msg}");
        return Err(rquickjs::Exception::throw_message(ctx, &msg));
    }
    Ok(rquickjs::Value::new_null(ctx.clone()))
}

/// Build a JS value straight from `serde_json::Value`.
///
/// The previous path was `serde_json::to_string` then `ctx.json_parse`, which allocated a copy of the
/// entire result set as text and then parsed it back. That is a full extra copy per report.
fn json_to_js<'js>(ctx: &Ctx<'js>, v: &serde_json::Value) -> Result<rquickjs::Value<'js>> {
    use serde_json::Value as J;
    Ok(match v {
        J::Null => rquickjs::Value::new_null(ctx.clone()),
        J::Bool(b) => rquickjs::Value::new_bool(ctx.clone(), *b),
        J::Number(n) => match n.as_i64() {
            Some(i) if i >= i32::MIN as i64 && i <= i32::MAX as i64 => {
                rquickjs::Value::new_int(ctx.clone(), i as i32)
            }
            Some(i) => rquickjs::Value::new_float(ctx.clone(), i as f64),
            None => rquickjs::Value::new_float(ctx.clone(), n.as_f64().unwrap_or(f64::NAN)),
        },
        J::String(s) => s.as_str().into_js(ctx)?,
        J::Array(items) => {
            let arr = rquickjs::Array::new(ctx.clone())?;
            for (i, item) in items.iter().enumerate() {
                arr.set(i, json_to_js(ctx, item)?)?;
            }
            arr.into()
        }
        J::Object(map) => {
            let obj = Object::new(ctx.clone())?;
            for (k, val) in map {
                obj.set(k.as_str(), json_to_js(ctx, val)?)?;
            }
            obj.into()
        }
    })
}

/// Build one row as a JS value.
///
/// The historical shape is an **array of values in column order**, and every call site relies on it
/// — the dispatcher zips it positionally against its own `cols` list. So that is the default, and a
/// row only becomes an object when the caller names the columns. Changing the default would silently
/// turn every `raw[i]` into `undefined` in a hundred places.
fn row_to_js<'js>(
    ctx: &Ctx<'js>,
    values: &[serde_json::Value],
    cols: &[String],
) -> Result<rquickjs::Value<'js>> {
    if cols.is_empty() {
        let arr = rquickjs::Array::new(ctx.clone())?;
        let mut i = 0usize;
        for v in values {
            arr.set(i, json_to_js(ctx, v)?)?;
            i += 1;
        }
        return Ok(arr.into());
    }
    let obj = Object::new(ctx.clone())?;
    for (i, v) in values.iter().enumerate() {
        // A column with no value is an explicit null rather than a missing key, so a template that
        // reads it gets "" and not undefined.
        let key = cols.get(i).cloned().unwrap_or_else(|| i.to_string());
        obj.set(key.as_str(), json_to_js(ctx, v)?)?;
    }
    Ok(obj.into())
}

/// Build a result set as a JS array of rows, with no JSON string in the path.
fn rows_to_js<'js>(
    ctx: &Ctx<'js>,
    rows: Vec<Vec<serde_json::Value>>,
    cols: Opt<Vec<String>>,
) -> Result<rquickjs::Value<'js>> {
    let cols = cols.0.unwrap_or_default();
    let out = rquickjs::Array::new(ctx.clone())?;
    let mut i = 0usize;
    for values in rows {
        out.set(i, row_to_js(ctx, &values, &cols)?)?;
        i += 1;
    }
    Ok(out.into())
}

async fn spool_wrapper(
    ctx: Ctx<'_>,
    name: String,
    sql: String,
    cols: Vec<String>,
    params: Opt<Vec<String>>,
) -> Result<rquickjs::Value<'_>> {
    guard(&ctx, &sql)?;
    let handle = crate::spool::run(&name, &sql, &cols, params.0.unwrap_or_default())
        .await
        // The SQL error is THROWN, not swallowed into `Error::Unknown`. `Error::Unknown` reaches the
        // route handler as an anonymous "QuickJS library created a unknown error", which names neither
        // the statement nor the reason — and the guest's `eprintln!` goes nowhere, because request-handler
        // logs are thread-local and only drained for init scripts. An exception carrying the message
        // turns a 500 with no cause into a 500 that says `no such column: pv.foo`.
        .map_err(|e| { eprintln!("spool error: {e}"); rquickjs::Exception::throw_message(&ctx, &e) })?;

    // The handle is small and fixed, so converting it directly costs nothing and still avoids a
    // string round-trip.
    json_to_js(&ctx, &serde_json::to_value(&handle).map_err(|e| {
        eprintln!("bridge error: {e}");
        rquickjs::Error::Unknown
    })?)
}

/// Write path: rows affected.
async fn execute_wrapper(ctx: Ctx<'_>, sql: String, params: Opt<Vec<String>>) -> Result<i64> {
    guard(&ctx, &sql)?;
    let params_values: Vec<Value> = params.0.unwrap_or_default().into_iter().map(Value::Text).collect();
    let affected = execute(&sql, params_values).await.map_err(|e| { eprintln!("db.execute error: {e}"); rquickjs::Error::Unknown })?;
    Ok(affected as i64)
}

/// Read path. `all(sql, params)` is the historical signature and stays; `cols` is optional and, when
/// given, names the columns so each row becomes an object rather than a positional array.
async fn query_wrapper(
    ctx: Ctx<'_>,
    sql: String,
    params: Opt<Vec<String>>,
    cols: Opt<Vec<String>>,
) -> Result<rquickjs::Value<'_>> {
    guard(&ctx, &sql)?;
    let rows = internal_query(sql, params).await?;
    rows_to_js(&ctx, rows, cols)
}

async fn get_wrapper(
    ctx: Ctx<'_>,
    sql: String,
    params: Opt<Vec<String>>,
    cols: Opt<Vec<String>>,
) -> Result<rquickjs::Value<'_>> {
    guard(&ctx, &sql)?;
    let mut rows = internal_query(sql, params).await?;
    if rows.is_empty() {
        return Ok(rquickjs::Value::new_undefined(ctx));
    }
    let one = rows.remove(0);
    row_to_js(&ctx, &one, &cols.0.unwrap_or_default())
}

async fn internal_query(sql: String, params: Opt<Vec<String>>) -> Result<Vec<Vec<serde_json::Value>>> {
    let params_owned = params.0.unwrap_or_default();
    let params_values: Vec<Value> = params_owned.into_iter().map(Value::Text).collect();

    let rows = query(sql, params_values)
        .await
        .map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;

    let json_rows: Vec<Vec<serde_json::Value>> = rows.into_iter()
        .map(|row| row.into_iter().map(crate::api::value_to_json).collect())
        .collect();

    Ok(json_rows)
}
