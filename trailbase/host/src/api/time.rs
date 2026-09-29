use rquickjs::{Function, Object, Result, Ctx, prelude::{Async}};
use trailbase_wasm::time::{sleep, Duration};

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();

    // Expose a 'time' module with sleep
    let time = Object::new(ctx.clone())?;
    time.set("sleep", Function::new(ctx.clone(), Async(sleep_js)))?;
    globals.set("time", time)?;

    // Global setTimeout/setInterval
    // Note: These are blocking in this implementation context (Wasm component model often handles this differently)
    // But for scripts, we can just map them to sleep for now or warn.
    // Ideally we'd register a callback with a host timer if available.
    // trailbase_wasm has a Timer but it might be for Jobs.
    // Simple sleep-based implementation for blocking scripts:
    
    globals.set("setTimeout", Function::new(ctx.clone(), Async(set_timeout_js)))?;
    
    // setInterval is dangerous if blocking.
    
    Ok(())
}

// Support simple blocking sleep
async fn sleep_js(ms: u64) -> Result<()> {
    sleep(Duration::from_millis(ms)).await;
    Ok(())
}

async fn set_timeout_js(cb: Function<'_>, delay: u64) -> Result<()> {
    // This will block execution, run callback, then return.
    // Not true async event loop behavior but suffices for some linear scripts.
    sleep(Duration::from_millis(delay)).await;
    cb.call::<_, ()>(())?;
    Ok(())
}
