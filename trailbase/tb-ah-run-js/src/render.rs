//! Rust `minijinja` rendering, exposed to runtime JS as `render(name, ctxJson)`.
//!
//! Templates are loaded from the views root
//! (falling back to the pages root), every name resolves views-root-relative (so
//! `{% extends 'layout.html' %}` works from a page in another directory), and the same ten
//! custom filters are registered. Templates are read fresh on each render; see `Loader` for
//! why an mtime cache is not used.

use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use minijinja::value::ValueKind;
use minijinja::{Environment, UndefinedBehavior, Value};

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// --- formatting helpers, ported from compute/format.js -------------------------------

/// Numbers, numeric strings and bools, matching JS `Number(v)` closely enough for the
/// formatting filters. `Value` in minijinja 2.24 exposes neither `as_f64` nor `as_bool`,
/// so non-integer numbers are read back through their serialized form.
fn num_of(v: &Value, d: f64) -> f64 {
    if let Some(i) = v.as_i64() {
        return i as f64;
    }
    if let Ok(json) = serde_json::to_value(v) {
        if let Some(f) = json.as_f64() {
            if f.is_finite() {
                return f;
            }
        }
        if let Some(s) = json.as_str() {
            let s = s.trim();
            if s.is_empty() {
                return 0.0;
            }
            if let Ok(n) = s.parse::<f64>() {
                if n.is_finite() {
                    return n;
                }
            }
            return d;
        }
    }
    match v.kind() {
        ValueKind::Bool => {
            if v.is_true() {
                1.0
            } else {
                0.0
            }
        }
        ValueKind::None | ValueKind::Undefined => 0.0,
        _ => d,
    }
}

fn date_only(v: &Value) -> String {
    let s = match v.as_str() {
        Some(s) => s,
        None => return String::new(),
    };
    if s.len() >= 10 {
        s[..10].to_string()
    } else {
        s.to_string()
    }
}

fn fmt_date(v: &Value) -> String {
    let d = date_only(v);
    let parts: Vec<&str> = d.split('-').collect();
    if parts.len() == 3 {
        if let Ok(m) = parts[1].parse::<usize>() {
            if (1..=12).contains(&m) {
                return format!("{}-{}-{}", parts[2], MONTHS[m - 1], parts[0]);
            }
        }
    }
    d
}

fn qty_display(box_v: &Value, qty_v: &Value) -> String {
    let box_size = num_of(box_v, 0.0);
    let b = if box_size == 0.0 { 1.0 } else { box_size };
    let n = num_of(qty_v, 0.0);
    let neg = if n < 0.0 { "-" } else { "" };
    let abs = n.abs();
    let ctns = (abs / b).floor();
    let units = abs % b;
    let ctn_w = if ctns == 1.0 { "ctn" } else { "ctns" };
    let unit_w = if units == 1.0 { "unit" } else { "units" };
    format!("{neg}{ctns} {ctn_w} {units} {unit_w}")
}

// --- template loader -----------------------------------------------------------------

/// Reads template sources from the configured roots (views first, then pages).
///
/// Deliberately uncached: `std::fs::metadata(...).modified()` does not change on the WASI
/// target, so an mtime cache never invalidates and serves stale templates for the life of
/// the instance. `Environment::get_template` re-reads and re-parses per render anyway, so
/// the cache only saved a file read. A parse cache, if wanted later, needs its own
/// invalidation that actually works on WASI (content hash, or a dev-mode bypass).
struct Loader {
    roots: Vec<PathBuf>,
}

impl Loader {
    fn source_for(&self, name: &str) -> Option<String> {
        let rel = name.replace('\\', "/");
        let rel = rel.trim_start_matches('/');
        for root in &self.roots {
            if let Ok(src) = std::fs::read_to_string(root.join(rel)) {
                return Some(src);
            }
        }
        None
    }
}

// --- renderer ------------------------------------------------------------------------

pub struct Renderer {
    env: Environment<'static>,
}

impl Renderer {
    pub fn new(views_root: PathBuf, pages_root: Option<PathBuf>, app_name: &str) -> Self {
        let mut roots = vec![views_root];
        if let Some(p) = pages_root {
            roots.push(p);
        }
        let loader = Arc::new(Loader { roots });

        let mut env = Environment::new();
        env.set_undefined_behavior(UndefinedBehavior::Lenient);
        env.set_trim_blocks(true);
        env.set_lstrip_blocks(true);
        env.add_global("appName", Value::from(app_name.to_string()));

        env.add_filter("money", |v: &Value| format!("{:.2}", num_of(v, 0.0)));
        env.add_filter("num", |v: &Value| {
            let n = num_of(v, 0.0);
            if n.fract() == 0.0 {
                format!("{n:.0}")
            } else {
                format!("{n}")
            }
        });
        env.add_filter("round", |v: &Value, d: Option<f64>| {
            format!("{:.*}", d.unwrap_or(2.0).max(0.0) as usize, num_of(v, 0.0))
        });
        env.add_filter("qty", |v: &Value, b: Option<Value>| {
            qty_display(&b.unwrap_or(Value::from(0.0)), v)
        });
        env.add_filter("date", |v: &Value| date_only(v));
        env.add_filter("datefmt", |v: &Value| fmt_date(v));
        env.add_filter("upper", |v: &Value| {
            v.as_str().unwrap_or_default().to_uppercase()
        });
        env.add_filter("lower", |v: &Value| {
            v.as_str().unwrap_or_default().to_lowercase()
        });
        env.add_filter("json", |v: &Value| {
            serde_json::to_string(v).unwrap_or_else(|_| "null".to_string())
        });
        env.add_filter("yesno", |v: &Value| {
            if v.is_true() { "Yes" } else { "No" }.to_string()
        });

        // Every include/extends name is views-root-relative, exactly as render.js does it.
        env.set_path_join_callback(|name, _parent| name.into());

        let l = loader.clone();
        env.set_loader(move |name| Ok(l.source_for(name)));

        Self { env }
    }

    /// Render with a context already converted to serde (the direct JS→serde bridge path): no
    /// JSON string round-trip. `crate::api` converts the JS value here.
    ///
    /// minijinja caches compiled templates by name and 2.24 has no auto-reload, so every render
    /// clears the cache first — otherwise on-disk edits are never seen (mtime is unusable on WASI,
    /// see `Loader`). This is the dev-friendly choice; a prod build may want a real cache.
    pub fn render_value(&mut self, name: &str, ctx: serde_json::Value) -> Result<String, String> {
        self.env.clear_templates();
        let ctx = Value::from_serialize(&ctx);
        let tmpl = self.env.get_template(name).map_err(|e| e.to_string())?;
        tmpl.render(ctx).map_err(|e| e.to_string())
    }

    pub fn render_string_value(&mut self, source: &str, ctx: serde_json::Value) -> Result<String, String> {
        self.env.clear_templates();
        let ctx = Value::from_serialize(&ctx);
        self.env.render_str(source, ctx).map_err(|e| e.to_string())
    }
}

/// A spool key spliced into the context under `field`.
///
/// This is the whole handoff: JS holds a string key, and the rows are read back out of the KV store
/// and turned into serde values **here in Rust**. Nothing about a 60k-row result is ever
/// materialised in QuickJS, and no JSON string is built for it.
#[derive(serde::Deserialize)]
pub struct SpoolRef {
  /// Where the rows land. Dotted paths create the objects along the way, so `"result.rows"`
  /// becomes `ctx.result.rows` — which is what the page-data payload needs.
  pub field: String,
  /// The KV key returned by `spool.run`.
  pub key: String,
}

/// Put `value` at a dotted path, creating the intermediate objects.
///
/// A path segment that already exists as a NON-object is replaced, because there is nowhere to
/// descend and a silent no-op would drop the rows while the call reports success.
fn splice(ctx: &mut serde_json::Map<String, serde_json::Value>, path: &str, value: serde_json::Value) {
  let mut cursor = ctx;
  let parts: Vec<&str> = path.split('.').filter(|p| !p.is_empty()).collect();
  let Some((last, parents)) = parts.split_last() else {
    return;
  };
  for part in parents {
    let entry = cursor
      .entry((*part).to_string())
      .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
    if !entry.is_object() {
      *entry = serde_json::Value::Object(serde_json::Map::new());
    }
    cursor = entry.as_object_mut().expect("just replaced with an object");
  }
  cursor.insert((*last).to_string(), value);
}

/// Load every spool and splice it into `ctx`.
///
/// Every spool is loaded BEFORE any is spliced, so one unreadable key fails the whole call instead
/// of leaving a context that is half spooled and half not.
fn splice_all(mut ctx: serde_json::Map<String, serde_json::Value>, spools: &[SpoolRef]) -> Result<serde_json::Map<String, serde_json::Value>, String> {
  let mut rows_for = Vec::with_capacity(spools.len());
  for spool in spools {
    rows_for.push(crate::spool::load(&spool.key)?);
  }
  for (spool, rows) in spools.iter().zip(rows_for) {
    splice(&mut ctx, &spool.field, rows);
  }
  return Ok(ctx);
}

fn release_all(keys: &[String]) {
  for key in keys {
    crate::spool::release(key);
  }
}

fn context_map(ctx: serde_json::Value) -> serde_json::Map<String, serde_json::Value> {
  match ctx {
    serde_json::Value::Object(map) => map,
    // A non-object context (null, a bare array) has nowhere to put `field`, so treat it as empty
    // rather than silently rendering a template that sees `undefined` for every row.
    _ => serde_json::Map::new(),
  }
}

/// Render with `ctx` plus any number of spooled row sets, then release the spools.
///
/// `release` runs even when rendering fails, so an error page cannot leak 60k rows into the KV
/// store. The rows live only for the duration of one render.
pub fn render_spooled(name: &str, ctx: serde_json::Value, spools: Vec<SpoolRef>) -> Result<String, String> {
  let keys: Vec<String> = spools.iter().map(|s| s.key.clone()).collect();

  let result = splice_all(context_map(ctx), &spools).and_then(|map| {
    with(|r| r.render_value(name, serde_json::Value::Object(map)))
  });

  release_all(&keys);

  return result.map_err(|e| format!("{e}"));
}

/// The same handoff, serialised as JSON instead of HTML.
///
/// The declarative pages (`/p/<slug>/data`) answer with a JSON body whose `result.rows` is the
/// report. QuickJS cannot build that body without the rows in it, so the rows are spliced here and
/// the WHOLE payload is serialised in Rust — JS hands over a small envelope and a key.
pub fn json_spooled(ctx: serde_json::Value, spools: Vec<SpoolRef>) -> Result<String, String> {
  let keys: Vec<String> = spools.iter().map(|s| s.key.clone()).collect();

  let result = splice_all(context_map(ctx), &spools)
    .and_then(|map| serde_json::to_string(&serde_json::Value::Object(map)).map_err(|e| e.to_string()));

  release_all(&keys);

  return result;
}

/// Process-wide renderer. Views live at `/app/views`, page templates at `/app/pages`,
/// matching the plan's `app/` directory contract under the runtime FS root.
pub fn global() -> &'static Mutex<Renderer> {
    static RENDERER: OnceLock<Mutex<Renderer>> = OnceLock::new();
    RENDERER.get_or_init(|| {
        Mutex::new(Renderer::new(
            PathBuf::from("/app/views"),
            Some(PathBuf::from("/app/pages")),
            "AA Point of Sale",
        ))
    })
}

/// Run `f` with the global renderer, recovering from a poisoned lock.
pub fn with<R>(f: impl FnOnce(&mut Renderer) -> R) -> R {
    let mut guard = global()
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    f(&mut guard)
}
