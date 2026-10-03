use rquickjs::{AsyncContext, AsyncRuntime, Ctx, Promise};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::sync::{Mutex, OnceLock};
// use std::path::Path;

/// Processed route source (TypeScript stripped, `export` removed) keyed by path.
///
/// `run_route` used to read + transpile (swc) the route file on **every** request. The file is
/// still read each time (so edits stay live), but its content hash decides whether the expensive
/// transpile is reused.
static CODE_CACHE: OnceLock<Mutex<HashMap<String, (u64, String)>>> = OnceLock::new();

fn code_cache() -> &'static Mutex<HashMap<String, (u64, String)>> {
    CODE_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn content_hash(source: &str) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    source.hash(&mut hasher);
    hasher.finish()
}

/// TypeScript -> JS (if needed), then the module-to-script `export` strip.
fn process_route(path: &str, raw: &str) -> anyhow::Result<String> {
    let code = if path.ends_with(".ts") {
        crate::ts_transform::compile_ts(raw)?
    } else {
        raw.to_string()
    };
    Ok(code
        .replace("export async function", "async function")
        .replace("export function", "function"))
}

/// The processed source for `path`, reusing the cache when the file is unchanged.
fn processed_route(path: &str, raw: &str) -> anyhow::Result<String> {
    let hash = content_hash(raw);
    let cache = code_cache();
    let mut guard = cache.lock().unwrap_or_else(|poison| poison.into_inner());
    if let Some((cached_hash, code)) = guard.get(path) {
        if *cached_hash == hash {
            return Ok(code.clone());
        }
    }
    let code = process_route(path, raw)?;
    guard.insert(path.to_string(), (hash, code.clone()));
    Ok(code)
}

#[derive(Clone, Serialize)]
pub struct ScriptReport {
    pub filename: String,
    pub log: String,
    pub result: String,
}

struct JsState {
    _runtime: AsyncRuntime,
    context: AsyncContext,
    reports: Vec<ScriptReport>,
}

thread_local! {
    static STATE: RefCell<Option<JsState>> = RefCell::new(None);
    static CURRENT_LOGS: RefCell<Vec<String>> = RefCell::new(Vec::new());
}

pub fn append_log(msg: &str) {
    CURRENT_LOGS.with(|logs| {
        logs.borrow_mut().push(msg.to_string());
    });
}

pub fn take_logs() -> String {
    CURRENT_LOGS.with(|logs| {
        let mut l = logs.borrow_mut();
        let res = l.join("\n");
        l.clear();
        res
    })
}

pub fn is_initialized() -> bool {
    STATE.with(|state| state.borrow().is_some())
}

pub fn get_reports() -> Vec<ScriptReport> {
    STATE.with(|state| {
        state.borrow().as_ref().map(|s| s.reports.clone()).unwrap_or_default()
    })
}

pub async fn init() -> anyhow::Result<Vec<ScriptReport>> {
    if is_initialized() {
        return Ok(get_reports());
    }
    
    let runtime = AsyncRuntime::new()?;
    let context = AsyncContext::full(&runtime).await?;
    
    // Initialize API
    context.async_with(|ctx| Box::pin(async move {
        crate::api::init_api(&ctx)
    })).await?;

    let mut reports = Vec::new();
    
    // Run init scripts from /ahscripts/init
    let init_reports = crate::init::run_init_scripts(&context).await?;
    reports.extend(init_reports);

    // Legacy /jscripts support (optional, or we can just remove it as per plan)
    // Plan implied replacing it.


    STATE.with(|state| {
        *state.borrow_mut() = Some(JsState { _runtime: runtime, context, reports: reports.clone() });
    });
    
    Ok(reports)
}

#[allow(dead_code)]
pub async fn run_js(script: &str) -> anyhow::Result<String> {
    // We need to clone context out of the thread local to await it
    let (context, needs_init) = STATE.with(|state| {
        if let Some(state) = state.borrow().as_ref() {
             (Some(state.context.clone()), false)
        } else {
             (None, true)
        }
    });

    if let Some(context) = context {
         let script = script.to_string();
         let res = context.async_with(|ctx| Box::pin(async move {
              let res: String = ctx.eval(script)?;
              Ok::<_, rquickjs::Error>(res)
         })).await;
         return map_js_result(res);
    } 

    if needs_init {
         // Fallback to fresh runtime if not initialized
         let runtime = AsyncRuntime::new()?;
         let context = AsyncContext::full(&runtime).await?;
         
         let script = script.to_string();
         let res = context.async_with(|ctx| Box::pin(async move {
             crate::api::init_api(&ctx)?;
             let res: String = ctx.eval(script)?;
             Ok::<_, rquickjs::Error>(res)
         })).await;
         return map_js_result(res);
    }
    
    Err(anyhow::anyhow!("Runtime state error"))
}


pub fn map_js_result(res: Result<String, rquickjs::Error>) -> anyhow::Result<String> {
    match res {
        Ok(s) => Ok(s),
        Err(e) => Err(anyhow::anyhow!("JS Error: {}", e)),
    }
}

// ── The route prelude ────────────────────────────────────────────────────────────────────
//
// The module loader, injected into EVERY route before the route's own code runs. It used to live
// inside `ahscripts/routes/_app/route.ts`, so only that one file could use it — and a route entry
// that reached for a shared module with `import` failed in the guest with `Unexpected token '{'`,
// because a route file is type-stripped by SWC and then ESM-rewritten by a regex shim and that
// composition does not survive an import statement.
//
// GENERATED. Source: route.ts lines 20-131, lifted verbatim with only the type annotations
// removed. Regenerate rather than edit — see the header of the generator.
pub const ROUTE_PRELUDE: &str = r##"// ── injected by the host into every route ────────────────────────────────────────────────
//
// The module loader, injected by `tb-ah-run-js` `run_route()` BEFORE the route's own code.
//
// It used to live inside `ahscripts/routes/_app/route.ts`, which meant only that one file could use
// it — and a route entry that reached for a shared module with `import` failed in the guest with
// `Unexpected token '{'`, because a route file is type-stripped by SWC and then ESM-rewritten by a
// regex shim, and that composition does not survive an import statement. Injecting the loader here
// gives every route entry a loader as a global: no ESM, no import, and no second copy of it.
//
// The body below is route.ts's, verbatim, with only the type annotations removed.
// ─────────────────────────────────────────────────────────────────────────────────────────────
(function () {
  const g = globalThis;
  if (g.__AA_LOAD__) return; // already installed in this context
  const MODULE_CACHE = (()=> {
    const g = globalThis;
    if (!g.__AA_MODS__) g.__AA_MODS__ = {};
    return g.__AA_MODS__;
  })();

  function normalizePath(p) {
    const abs = String(p).startsWith("/");
    const parts = String(p).replace(/\\/g, "/").split("/");
    const out = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") {
        out.pop();
        continue;
      }
      out.push(part);
    }
    return (abs ? "/" : "") + out.join("/");
  }

  function dirOf(p) {
    const n = normalizePath(p);
    const i = n.lastIndexOf("/");
    return i <= 0 ? "/" : n.slice(0, i);
  }

  function resolveSpec(from, spec) {
    if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
      return normalizePath(dirOf(from) + "/" + spec);
    }
    return spec;
  }

  function transformEsm(src) {
    const names = [];
    const deps = [];
    let code = String(src);

    code = code.replace(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_m, list, spec)=> {
      deps.push(spec);
      const bind = list
        .split(",")
        .map((s)=> s.trim())
        .filter(Boolean)
        .map((n)=> {
          const m = n.split(/\s+as\s+/);
          // `{ exported as local }` -> `{ exported: local }`
          return m.length === 2 ? `${m[0]}: ${m[1]}` : n;
        })
        .join(", ");
      return `const { ${bind} } = __require(${JSON.stringify(spec)});`;
    });

    code = code.replace(/import\s*\*\s*as\s+([A-Za-z0-9_$]+)\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_m, ns, spec)=> {
      deps.push(spec);
      return `const ${ns} = __require(${JSON.stringify(spec)});`;
    });

    code = code.replace(/import\s+([A-Za-z0-9_$]+)\s*from\s*['"]([^'"]+)['"]\s*;?/g, (_m, name, spec)=> {
      deps.push(spec);
      return `const ${name} = __require(${JSON.stringify(spec)}).default;`;
    });

    code = code.replace(/import\s*['"]([^'"]+)['"]\s*;?/g, (_m, spec)=> {
      deps.push(spec);
      return `__require(${JSON.stringify(spec)});`;
    });

    code = code.replace(/\bexport\s*\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"]\s*)?;?/g, (_m, list, spec)=> {
      const lines = [];
      if (spec) deps.push(spec);
      for (const raw of list.split(",")) {
        const n = raw.trim();
        if (!n) continue;
        const m = n.split(/\s+as\s+/);
        const local = m[1] || m[0];
        names.push(local);
        lines.push(spec ? `const ${local} = __require(${JSON.stringify(spec)})[${JSON.stringify(m[0])}];` : m[1] ? `const ${local} = ${m[0]};` : ``);
      }
      return lines.filter(Boolean).join("\n");
    });

    code = code.replace(/\bexport\s+default\s+/g, "const __default = ");
    code = code.replace(/\bexport\s+(async\s+)?function\s+([A-Za-z0-9_$]+)/g, (_m, a, n)=> {
      names.push(n);
      return `${a || ""}function ${n}`;
    });
    code = code.replace(/\bexport\s+(const|let|var)\s+([A-Za-z0-9_$]+)/g, (_m, k, n)=> {
      names.push(n);
      return `${k} ${n}`;
    });

    return { code, names, deps };
  }

  async function loadModule(path) {
    const key = normalizePath(path);
    if (MODULE_CACHE[key]) return MODULE_CACHE[key];
    const src = await fs.readFile(key);
    const { code, names, deps } = transformEsm(src);
    for (const dep of deps) await loadModule(resolveSpec(key, dep));
    const exports = {};
    const assign = names
      .map((n)=> `try { __exports[${JSON.stringify(n)}] = typeof ${n} !== "undefined" ? ${n} : undefined; } catch (e) {}`)
      .join("\n");
    const factory = new Function("__require", "__exports", code + "\n" + assign);
    factory((spec)=> MODULE_CACHE[resolveSpec(key, spec)], exports);
    MODULE_CACHE[key] = exports;
    return exports;
  }


  g.__AA_LOAD__ = loadModule;
  g.__AA_TRANSFORM_ESM__ = transformEsm;
})();"##;

pub async fn run_route(path: &str, method: &str, req: serde_json::Value) -> anyhow::Result<serde_json::Value> {
    // Read every time (edits stay live); transpile only when the content changed.
    let raw_code = fs::read_to_string(path)?;
    let code = processed_route(path, &raw_code)?;
                   
    // Serialize request to JSON string to embed safely
    let req_json = serde_json::to_string(&req)?;
    
    // Wrapper to execute the specific method
    //
    // `ROUTE_PRELUDE` runs BEFORE the route's own code, so every route entry has `__AA_LOAD__` — the
    // module loader — as a global. That is what lets a route reach a shared module without an `import`,
    // which a route file cannot carry (see the constant's comment), and it is why most routes will
    // need no JavaScript at all.
    //
    // It is an IIFE that returns early when `__AA_LOAD__` already exists, so the per-context cost is one
    // closure on the first route and nothing on the rest.
    let wrapper = format!(
        r#"
        (function () {{
          {prelude}
        }})();

        {code}
        
        (async () => {{
            if (typeof {method} !== 'function') {{
                throw new Error("Method {method} not exported/defined in route");
            }}
            const req = JSON.parse(globalThis.__TRAILBASE_REQ__);
            const res = await {method}(req);
            return JSON.stringify(res);
        }})()
        "#,
        prelude = ROUTE_PRELUDE,
        code = code,
        method = method
    );

    // We need to clone context out of the thread local to await it
    let mut context = STATE.with(|state| {
        state.borrow().as_ref().map(|s| s.context.clone())
    });

    if context.is_none() {
         // Initialize if missing
         let _ = init().await?;
         
         // Try getting context again
         context = STATE.with(|state| {
             state.borrow().as_ref().map(|s| s.context.clone())
         });
    }

    if let Some(ctx) = context {
         // Reuse the JSON string we created earlier
         let req_string = req_json.clone(); 
         let res = ctx.async_with(|ctx| Box::pin(async move {
            ctx.globals().set("__TRAILBASE_REQ__", req_string)?;
            
            // A promise, or an eval failure whose exception we surface verbatim.
            let promise: Promise = match ctx.eval(wrapper.as_str()) {
                Ok(promise) => promise,
                Err(error) => {
                    return Ok::<_, rquickjs::Error>(format!(
                        "__JS_ERROR__: {}",
                        js_error_detail(&ctx, &error)
                    ));
                }
            };
            match unsafe { SendWrapper::new(promise.into_future()) }.await {
                Ok(result) => Ok::<_, rquickjs::Error>(result),
                Err(error) => Ok::<_, rquickjs::Error>(format!(
                    "__JS_ERROR__: {}",
                    js_error_detail(&ctx, &error)
                )),
            }
         })).await;
         
         let json_str = map_js_result(res)?;
         if let Some(detail) = json_str.strip_prefix("__JS_ERROR__: ") {
             return Err(anyhow::anyhow!("{}", detail));
         }
         let val: serde_json::Value = serde_json::from_str(&json_str)?;
         return Ok(val);
    }

    Err(anyhow::anyhow!("Runtime state error after init"))
}

/// The message of the pending JS exception, if any (rquickjs's own `Display` is generic).
fn js_error_detail(ctx: &Ctx<'_>, fallback: &rquickjs::Error) -> String {
    let caught = ctx.catch();
    if let Some(exception) = caught.as_exception() {
        if let Some(message) = exception.message() {
            return message;
        }
    }
    if let Some(text) = caught.as_string() {
        if let Ok(value) = text.to_string() {
            return value;
        }
    }
    format!("{}", fallback)
}

pub struct SendWrapper<T>(T);

impl<T> SendWrapper<T> {
    pub unsafe fn new(t: T) -> Self {
        Self(t)
    }
}

unsafe impl<T> Send for SendWrapper<T> {}

impl<T: std::future::Future> std::future::Future for SendWrapper<T> {
    type Output = T::Output;

    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>) -> std::task::Poll<Self::Output> {
        let inner = unsafe { self.map_unchecked_mut(|s| &mut s.0) };
        inner.poll(cx)
    }
}
