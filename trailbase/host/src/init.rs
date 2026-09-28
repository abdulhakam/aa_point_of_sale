use rquickjs::{AsyncContext, Promise};
use std::fs;
use std::path::{Path, PathBuf};
use crate::runtime::{ScriptReport, SendWrapper, map_js_result};

pub async fn run_init_scripts(context: &AsyncContext) -> anyhow::Result<Vec<ScriptReport>> {
    let init_path = Path::new("/ahscripts/init");
    if !init_path.exists() {
        println!("/ahscripts/init directory not found");
        return Ok(Vec::new());
    }

    let mut reports = Vec::new();
    let scripts = collect_scripts(init_path)?;

    for path in scripts {
        let report = execute_init_script(&path, context).await?;
        reports.push(report);
    }

    Ok(reports)
}

pub async fn ensure_global_init() -> anyhow::Result<()> {
    // Check if we already ran global init (e.g. DB setup) for this server instance.
    // We compare "server_start_time" (set in lib.rs) with "last_init_time".
    
    use trailbase_wasm::kv::Store;
    
    let mut store = Store::open().map_err(|_| anyhow::anyhow!("Failed to open KV store"))?;
    
    let start_time = store.get("server_start_time").unwrap_or(None);
    let last_init = store.get("last_init_time").unwrap_or(None);
    
    // If we have a start time, and it differs from last init, we run.
    // If start time is missing (shouldn't happen if http_handlers called), we might default to running?
    // Let's run if they don't match.
    
    let should_run = match (start_time.as_ref(), last_init.as_ref()) {
        (Some(start), Some(last)) => start != last,
        (Some(_), None) => true,
        (None, _) => {
            // Edge case: server_start_time not set yet? 
            // Maybe we are running from a job before http_handlers?
            // Let's run to be safe and NOT update last_init_time (so we retry until start_time is set?)
            // Or just return Ok because we can't sync?
            // "ensure init scripts run when server is started". 
            // If we run now, we might run again when start_time IS set. 
            // Let's run, but warn.
            println!("Warning: ensure_global_init called but server_start_time not set in KV.");
            true 
        }
    };
    
    if !should_run {
        return Ok(());
    }
    
    // Not done / mismatch. Run them.
    use rquickjs::{AsyncRuntime, AsyncContext};
    
    let runtime = AsyncRuntime::new()?;
    let context = AsyncContext::full(&runtime).await?;
    
    // 1. Initialize API (requires Ctx)
    context.async_with(|ctx| Box::pin(async move {
         crate::api::init_api(&ctx)
    })).await.map_err(|e| anyhow::anyhow!("Init API failed: {}", e))?;
    
    // 2. Run init scripts (handles its own context locking)
    match run_init_scripts(&context).await {
        Ok(reports) => {
            for report in reports {
                if !report.log.is_empty() {
                    println!("[Init Script] {}:", report.filename);
                    println!("{}", report.log);
                }
                if report.result != "success" {
                    println!("[Init Script] {} result: {}", report.filename, report.result);
                }
            }
        },
        Err(e) => return Err(e),
    }
    
    // Update last_init_time to match server_start_time
    if let Some(start) = start_time {
        let _ = store.set("last_init_time", &start);
    }
    
    Ok(())
}

fn collect_scripts(dir: &Path) -> anyhow::Result<Vec<PathBuf>> {
    let mut scripts = Vec::new();
    let mut dirs = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        let mut entry_list: Vec<_> = entries.flatten().collect();
        entry_list.sort_by_key(|e| e.path());

        for entry in entry_list {
            let path = entry.path();
            if path.is_dir() {
                dirs.push(path);
            } else if path.extension().map_or(false, |e| e == "js") {
                scripts.push(path);
            }
        }
    }

    // Recurse into subdirectories
    for dir_path in dirs {
        let mut sub_scripts = collect_scripts(&dir_path)?;
        scripts.append(&mut sub_scripts);
    }

    Ok(scripts)
}

async fn execute_init_script(path: &Path, context: &AsyncContext) -> anyhow::Result<ScriptReport> {
    // Clear logs via runtime helper (we need to access runtime::take_logs, but it's private/local)
    // We should probably expose log clearing or just capture what we can.
    // Ideally runtime.rs should expose a "run_with_logging" helper, but strictly following the new module pattern:
    
    // We'll trust the global log capture mechanism in runtime.rs works if we just run code.
    // But `take_logs` is thread-local in runtime.rs. We can't access it easily from here without it being pub.
    // For now, let's assuming we can refactor runtime.rs to expose log capture, 
    // or we just call a helper in runtime.rs?
    // Actually the plan was to call this FROM runtime.rs, so maybe we can keep the logging logic there 
    // or just assume we capture what we can. 
    
    // Let's implement the execution logic here.
    
    let filename = path.file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    let raw_code = fs::read_to_string(path)?;
    
    println!("Executing init script: {:?}", path);

    // Universal strategy: Replace "export default" with "const _ah_export ="
    // This turns "export default async function..." into "const _ah_export = async function..." (valid expression)
    // And "export default { ... }" into "const _ah_export = { ... }" (valid)
    
    let code_clean = raw_code.replace("export default", "const _ah_export =");
    
    let run_code = format!(
        r#"
        (async () => {{
            try {{
                {code}
                
                if (typeof _ah_export === 'function') {{
                    await _ah_export();
                }}
            }} catch (e) {{
                console.error("JS Error in {filename}: " + e + "\n" + (e.stack || ""));
                throw e; 
            }}
        }})()
        "#,
        code = code_clean,
        filename = filename
    );

    // We need to capture logs. 
    // Since `take_logs` is in runtime, let's make it pub there or expose a helper.
    // For now, I'll assume we can make `runtime::take_logs` public.

    let _ = crate::runtime::take_logs(); // Clear previous logs
    
    let res = context.async_with(|ctx| Box::pin(async move {
            let promise: Promise = ctx.eval(run_code.as_str())?;
            let res: String = unsafe { SendWrapper::new(promise.into_future()) }.await?;
            Ok::<_, rquickjs::Error>(res)
    })).await;
    
    let log_output = crate::runtime::take_logs();
    
    let result_msg = match map_js_result(res) {
        Ok(_) => "success".to_string(),
        Err(e) => {
            eprintln!("Error in init script {:?}: {}", path, e);
            format!("error: {}", e)
        }
    };

    Ok(ScriptReport {
        filename,
        log: log_output,
        result: result_msg
    })
}
