use rquickjs::{Function, Object, Result, Ctx, Value as JsValue};
use rquickjs::prelude::{Async, Opt, Rest};
use trailbase_wasm::db::{Value, query};

mod fetch;
mod fs;
mod kv;
mod sqlite;
mod time;

pub fn init_api(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    // Use an object to group trailbase functions
    let trailbase = Object::new(ctx.clone())?;
    
    // Use Async wrapper for async functions
    trailbase.set("query", Function::new(ctx.clone(), Async(query_js)))?;

    globals.set("trailbase", trailbase)?;

    // Polyfill: db (alias to functionality we have)
    // Most scripts use db.query
    let db = Object::new(ctx.clone())?;
    db.set("query", Function::new(ctx.clone(), Async(query_js)))?;
    db.set("execute", Function::new(ctx.clone(), Async(execute_js)))?;
    globals.set("db", db)?;

    // Polyfill: console
    let console = Object::new(ctx.clone())?;
    console.set("log", Function::new(ctx.clone(), |args: Rest<JsValue>| {
        let text = args.iter().map(js_val_to_string).collect::<Vec<_>>().join(" ");
        println!("{}", text);
        crate::runtime::append_log(&text);
    }))?;
    console.set("error", Function::new(ctx.clone(), |args: Rest<JsValue>| {
        let text = args.iter().map(js_val_to_string).collect::<Vec<_>>().join(" ");
        eprintln!("{}", text);
        crate::runtime::append_log(&format!("ERROR: {}", text));
    }))?;
    console.set("warn", Function::new(ctx.clone(), |args: Rest<JsValue>| {
        let text = args.iter().map(js_val_to_string).collect::<Vec<_>>().join(" ");
        println!("{}", text);
        crate::runtime::append_log(&format!("WARN: {}", text));
    }))?;
    console.set("info", Function::new(ctx.clone(), |args: Rest<JsValue>| {
        let text = args.iter().map(js_val_to_string).collect::<Vec<_>>().join(" ");
        println!("{}", text);
        crate::runtime::append_log(&format!("INFO: {}", text));
    }))?;
    globals.set("console", console)?;

    // New modules
    fetch::init(ctx)?;
    fs::init(ctx)?;
    kv::init(ctx)?;
    kv::init(ctx)?;
    sqlite::init(ctx)?;
    crate::api::time::init(ctx)?;

    // Rust minijinja rendering, exposed to scripts:
    //   render.html(name, ctx)   -> views/pages template by name
    //   render.string(source, ctx) -> inline template source
    //
    // `ctx` is converted directly from the JS value to serde (see `js_to_json`), so the large
    // render context no longer round-trips through a JSON string (JS `JSON.stringify` + Rust
    // `from_str`). A string argument is still accepted for back-compatibility.
    let render = Object::new(ctx.clone())?;
    render.set(
        "html",
        Function::new(ctx.clone(), |name: String, ctx_val: Opt<JsValue>| -> Result<String> {
            let json = ctx_json_value(ctx_val.0.as_ref());
            crate::render::with(|r| r.render_value(&name, json))
                .map_err(|e| {
                    eprintln!("render error: {e}");
                    rquickjs::Error::Unknown
                })
        }),
    )?;
    render.set(
        "string",
        Function::new(ctx.clone(), |source: String, ctx_val: Opt<JsValue>| -> Result<String> {
            let json = ctx_json_value(ctx_val.0.as_ref());
            crate::render::with(|r| r.render_string_value(&source, json))
                .map_err(|e| {
                    eprintln!("render error: {e}");
                    rquickjs::Error::Unknown
                })
        }),
    )?;
    globals.set("render", render)?;

    Ok(())
}

/// Convert a JS render-context value to `serde_json::Value` without a JSON string round-trip.
/// A string is treated as pre-serialized JSON (back-compat with `render.html(name, JSON.stringify(x))`).
fn ctx_json_value(value: Option<&JsValue<'_>>) -> serde_json::Value {
    match value {
        None => serde_json::json!({}),
        Some(val) => {
            if let Some(s) = val.as_string() {
                let text = s.to_string().unwrap_or_default();
                if text.trim().is_empty() {
                    return serde_json::json!({});
                }
                return serde_json::from_str(&text).unwrap_or_else(|_| serde_json::json!({}));
            }
            js_to_json(val)
        }
    }
}

/// Generic JS value → serde walker: objects, arrays, strings, numbers, bools, null.
fn js_to_json(value: &JsValue<'_>) -> serde_json::Value {
    use serde_json::Value as J;
    if value.is_undefined() || value.is_null() {
        return J::Null;
    }
    if let Some(b) = value.as_bool() {
        return J::Bool(b);
    }
    if let Some(i) = value.as_int() {
        return J::Number(i.into());
    }
    if let Some(f) = value.as_float() {
        return serde_json::Number::from_f64(f)
            .map(J::Number)
            .unwrap_or(J::Null);
    }
    if let Some(s) = value.as_string() {
        return s.to_string().map(J::String).unwrap_or(J::Null);
    }
    if let Some(arr) = value.as_array() {
        let mut out = Vec::new();
        for item in arr.iter::<JsValue>() {
            if let Ok(v) = item {
                out.push(js_to_json(&v));
            }
        }
        return J::Array(out);
    }
    if let Some(obj) = value.as_object() {
        let mut map = serde_json::Map::new();
        for entry in obj.props::<String, JsValue>() {
            if let Ok((key, v)) = entry {
                map.insert(key, js_to_json(&v));
            }
        }
        return J::Object(map);
    }
    J::Null
}

fn js_val_to_string(v: &JsValue) -> String {
    // Basic conversion for logging
    if let Some(s) = v.as_string() {
        return s.to_string().unwrap_or_default();
    }
    format!("{:?}", v)
}

// Remove Ctx from args if not strictly needed properly for Async wrapper, or keep it.
// Usually Async functions work with standard args.
async fn query_js(sql: String, params: Opt<Vec<String>>) -> Result<String> {
    let params_owned = params.0.unwrap_or_default();
    
    // Convert String params to Value
    let params_values: Vec<Value> = params_owned.into_iter().map(Value::Text).collect();
    
    let rows = query(sql, params_values)
        .await
        .map_err(|e| { eprintln!("db error: {e}"); rquickjs::Error::Unknown })?;

    let json_rows: Vec<Vec<serde_json::Value>> = rows.into_iter()
        .map(|row| row.into_iter().map(value_to_json).collect())
        .collect();
        
    serde_json::to_string(&json_rows).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })
}

/// Write path: `db.execute(sql, params)` → rows affected. The record APIs are bypassed, so
/// this is the guest's only way to mutate (and the only one it needs).
async fn execute_js(sql: String, params: Opt<Vec<String>>) -> Result<i64> {
    let params_values: Vec<Value> = params
        .0
        .unwrap_or_default()
        .into_iter()
        .map(Value::Text)
        .collect();

    let affected = trailbase_wasm::db::execute(&sql, params_values)
        .await
        .map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;

    Ok(affected as i64)
}

fn value_to_json(v: Value) -> serde_json::Value {    match v {
        Value::Null => serde_json::Value::Null,
        Value::Integer(i) => serde_json::Value::Number(i.into()),
        // Handle Real carefully as f64 might be NaN/Inf
        Value::Real(f) => serde_json::Number::from_f64(f)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        Value::Text(s) => serde_json::Value::String(s),
        // Use TrailBase's own convention (padded URL-safe base64) so ids are safe in URLs and
        // match what the record API returns.
        Value::Blob(b) => {
             use base64::Engine as _;
             serde_json::Value::String(base64::engine::general_purpose::URL_SAFE.encode(b))
        }, 

    }
}
