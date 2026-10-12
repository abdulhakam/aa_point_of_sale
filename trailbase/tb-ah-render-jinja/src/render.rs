//! Rust `minijinja` rendering, exposed to runtime JS as `render(name, ctxJson)`.
//!
//! Templates are loaded from the configured roots — `/ahscripts/routes` (colocated route
//! templates), then `/ahscripts/views` (the shared `layout.html.jinja` and `partials/*`), then
//! `/ahscripts/pages` (declarative page templates) — and every name resolves root-relative (so
//! `{% extends 'layout.html.jinja' %}` works from a route template in another directory). The same
//! ten custom filters are registered. Templates are read fresh on each render; see `Loader` for why
//! an mtime cache is not used.

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

/// Reads template sources from the configured roots, in order (routes, then views, then pages).
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
    pub fn new(roots: Vec<PathBuf>, app_name: &str) -> Self {
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

        // Every include/extends name resolves root-relative against the roots, in order.
        env.set_path_join_callback(|name, _parent| name.into());

        let l = loader.clone();
        env.set_loader(move |name| Ok(l.source_for(name)));

        Self { env }
    }

    fn context(ctx_json: &str) -> Result<Value, String> {
        let text = ctx_json.trim();
        if text.is_empty() {
            return Ok(Value::from_serialize(serde_json::json!({})));
        }
        let json: serde_json::Value = serde_json::from_str(text).map_err(|e| e.to_string())?;
        Ok(Value::from_serialize(&json))
    }

    pub fn render(&mut self, name: &str, ctx_json: &str) -> Result<String, String> {
        // minijinja caches compiled templates by name and 2.24 has no auto-reload, so clear
        // before each render or on-disk edits are never seen (mtime is unusable on WASI — see
        // `Loader`). This is the dev-friendly choice; a prod build may want a real cache.
        self.env.clear_templates();
        let ctx = Self::context(ctx_json)?;
        let tmpl = self.env.get_template(name).map_err(|e| e.to_string())?;
        tmpl.render(ctx).map_err(|e| e.to_string())
    }

    pub fn render_string(&mut self, source: &str, ctx_json: &str) -> Result<String, String> {
        self.env.clear_templates();
        let ctx = Self::context(ctx_json)?;
        self.env.render_str(source, ctx).map_err(|e| e.to_string())
    }
}

/// Process-wide renderer.
///
/// One per WASM instance, and TrailBase instantiates the component once per runtime thread, so
/// each thread gets its own environment and its own template cache — there is no cross-thread
/// contention on this lock.
///
/// The roots are the same three the app host uses: colocated route templates at
/// `/ahscripts/routes`, the shared shell at `/ahscripts/views`, and declarative page templates at
/// `/ahscripts/pages`. `app_name` comes from the caller's `options.app`, and defaults to empty — this
/// component has no opinion about whose business it renders, which is the point of it being
/// separate.
pub fn global() -> &'static Mutex<Renderer> {
  static RENDERER: OnceLock<Mutex<Renderer>> = OnceLock::new();
  RENDERER.get_or_init(|| {
    Mutex::new(Renderer::new(
      vec![
        PathBuf::from("/ahscripts/routes"),
        PathBuf::from("/ahscripts/views"),
        PathBuf::from("/ahscripts/pages"),
      ],
      "",
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
