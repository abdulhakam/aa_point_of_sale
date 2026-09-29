use rquickjs::{Function, Object, Result, Ctx, prelude::{Async, Opt}};
use trailbase_wasm::db::{execute, query, Value};

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    let sqlite = Object::new(ctx.clone())?;

    sqlite.set("execute", Function::new(ctx.clone(), Async(execute_wrapper)))?;
    sqlite.set("run", Function::new(ctx.clone(), Async(execute_wrapper)))?;
    sqlite.set("get", Function::new(ctx.clone(), Async(get_wrapper)))?; // Returns first row
    sqlite.set("all", Function::new(ctx.clone(), Async(query_wrapper)))?; 

    globals.set("sqlite", sqlite)?;
    Ok(())
}

/// Write path: rows affected.
async fn execute_wrapper(sql: String, params: Opt<Vec<String>>) -> Result<i64> {
    let params_values: Vec<Value> = params.0.unwrap_or_default().into_iter().map(Value::Text).collect();
    let affected = execute(&sql, params_values).await.map_err(|e| { eprintln!("db.execute error: {e}"); rquickjs::Error::Unknown })?;
    Ok(affected as i64)
}

// Re-use logic from api.rs query_js or similar
// For now, simple implementation
// Explicitly use rquickjs::Value for return to avoid trait bound ambiguity
async fn query_wrapper(ctx: Ctx<'_>, sql: String, params: Opt<Vec<String>>) -> Result<rquickjs::Value<'_>> {
    let rows = internal_query(sql, params).await?;
    // Convert to JS Value
    // serde_json::Value to rquickjs::Value
    let json_str = serde_json::to_string(&rows).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    let val: rquickjs::Value = ctx.json_parse(json_str)?;
    Ok(val)
}

async fn get_wrapper(ctx: Ctx<'_>, sql: String, params: Opt<Vec<String>>) -> Result<rquickjs::Value<'_>> {
    let mut rows = internal_query(sql, params).await?;
    if rows.is_empty() {
        return Ok(rquickjs::Value::new_undefined(ctx));
    }
    let row = rows.remove(0);
    let json_str = serde_json::to_string(&row).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    let val: rquickjs::Value = ctx.json_parse(json_str)?;
    Ok(val)
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
