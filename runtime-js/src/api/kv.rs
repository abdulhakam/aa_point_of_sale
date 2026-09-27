use rquickjs::{Function, Result, Ctx, prelude::{Async}};
use trailbase_wasm::kv::Store;

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    
    let kv_obj = rquickjs::Object::new(ctx.clone())?;
    kv_obj.set("get", Function::new(ctx.clone(), Async(kv_get)))?;
    kv_obj.set("set", Function::new(ctx.clone(), Async(kv_set)))?;
    kv_obj.set("delete", Function::new(ctx.clone(), Async(kv_delete)))?;
    globals.set("kv", kv_obj)?;

    Ok(())
}

async fn kv_get(key: String) -> Result<Option<String>> {
    let store = Store::open().map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    let val = store.get(&key).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    
    if let Some(bytes) = val {
        let s = String::from_utf8(bytes).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
        Ok(Some(s))
    } else {
        Ok(None)
    }
}

async fn kv_set(key: String, val: String) -> Result<()> {
    let mut store = Store::open().map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    store.set(&key, val.as_bytes())
        .map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    Ok(())
}

async fn kv_delete(key: String) -> Result<()> {
    let mut store = Store::open().map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    store.delete(&key)
        .map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    Ok(())
}
