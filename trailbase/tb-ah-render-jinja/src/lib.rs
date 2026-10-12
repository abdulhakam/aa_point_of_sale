//! `tb-ah-render-jinja.wasm` — the renderer as its own TrailBase guest component.
//!
//! # Why this is a separate component
//!
//! minijinja was folded into the app host by [[runtime-js-single-host]] because composition
//! measured faster (see [[component-split-and-sql-materialised-tables]]: a cross-component handoff
//! costs ~1.4 s per 60k rows). That measurement was for **acquisition**, where rows are pushed
//! *through* the hop as a value. A render stage that receives an **address** does not push the
//! payload through anything, so the render split is a different measurement — and this component
//! is what settles it.
//!
//! The reason to split at all is not speed: it is that a renderer you cannot swap is a renderer you
//! cannot choose. This one speaks a versioned envelope and advertises its capabilities, so another
//! renderer can replace it without either side knowing the other's implementation.
//! See [[rendering-is-a-component-behind-an-envelope]].
//!
//! # The envelope
//!
//! Request (`aa_render` is required, so an older peer can be detected rather than guessed at):
//!
//! ```json
//! { "aa_render": 1, "request_id": "…",
//!   "template": { "name": "invoices/document.html.jinja" },
//!   "context":  { "address": { "store": "kv", "key": "…", "bytes": 1234, "format": "json" } },
//!   "options":  { "paper": "a5" },
//!   "requires": ["extends", "import", "filters:money"] }
//! ```
//!
//! The context is EITHER inline JSON or an address this component resolves itself from the shared KV
//! store. That is the whole trick: the hop carries a few hundred bytes of envelope regardless of how
//! large the document is, and the payload never crosses it.
//!
//! Response:
//!
//! ```json
//! { "aa_render": 1, "status": "ok", "body": "…", "content_type": "text/html",
//!   "diagnostics": { "renderer": "minijinja", "template_ms": 3, "bytes": 15793 } }
//! ```
//!
//! `diagnostics` is mandatory on success AND failure. A renderer that cannot say which template and
//! how long is not replaceable in practice, and TrailBase's only other failure signal is the opaque
//! `component responded unexpectedly`.
//!
//! # The URL space
//!
//! TrailBase merges every component's handlers into ONE flat axum router and panics at startup on an
//! identical method+path, so this component owns `/render/*` and must never claim a wildcard —
//! [[trailbase-loads-multiple-components-flat-router]].

use std::time::Instant;

use trailbase_wasm::http::{HttpError, HttpRoute, IntoResponse, Request, Response, StatusCode, routing};
use trailbase_wasm::kv::Store;
use trailbase_wasm::{Guest, export};

mod render;

struct Endpoints;

/// The envelope version this component implements.
const ENVELOPE: i64 = 1;

/// What this renderer can do. The caller sends `requires` and this checks it rather than
/// pretending: a template whose `{% extends %}` silently does nothing is worse than a refusal.
const CAPABILITIES: &[&str] = &[
  "extends",
  "include",
  "import",
  "macros",
  "filters:money",
  "filters:num",
  "filters:round",
  "filters:qty",
  "filters:date",
  "filters:datefmt",
  "filters:upper",
  "filters:lower",
  "filters:json",
  "filters:yesno",
];

impl Guest for Endpoints {
  fn http_handlers() -> Vec<HttpRoute> {
    return vec![
      routing::post("/render", render_handler),
      routing::get("/render/capabilities", capabilities_handler),
    ];
  }
}

/// What this renderer is, for the caller's negotiation. `aa_render` is echoed so a peer can
/// detect a version mismatch without parsing anything else.
async fn capabilities_handler(_req: Request) -> Result<Response, HttpError> {
  let body = serde_json::json!({
    "aa_render": ENVELOPE,
    "renderer": "minijinja",
    "requires": CAPABILITIES,
    "source": false,
  });
  let payload = serde_json::to_string(&body).map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, e))?;
  return Ok(payload.into_response());
}

fn error_envelope(status: &str, message: &str, started: Instant) -> Response {
  let body = serde_json::json!({
    "aa_render": ENVELOPE,
    "status": status,
    "error": message,
    "content_type": "application/json",
    "diagnostics": {
      "renderer": "minijinja",
      "template_ms": started.elapsed().as_millis() as u64,
      "bytes": 0,
    },
  });
  // An error answer is still a well-formed envelope, so the caller parses one shape either way.
  let payload = serde_json::to_string(&body).unwrap_or_else(|_| "{\"aa_render\":1,\"status\":\"error\"}".into());
  return payload.into_response();
}

async fn render_handler(mut req: Request) -> Result<Response, HttpError> {
  let started = Instant::now();
  // `IncomingBody` offers json()/bytes(), not text(); parsing to a Value here also means the
  // envelope's own type errors come back as one shape rather than a bare serde failure.
  let envelope: serde_json::Value = match req.body().json::<serde_json::Value>().await {
    Ok(v) => v,
    Err(e) => return Ok(error_envelope("error", &format!("envelope is not JSON: {e}"), started)),
  };

  // Version first: an unknown envelope is a refusal, not a best-effort render.
  let version = envelope.get("aa_render").and_then(|v| v.as_i64()).unwrap_or(0);
  if version != ENVELOPE {
    return Ok(error_envelope(
      "error",
      &format!("unsupported envelope version {version}; this renderer speaks {ENVELOPE}"),
      started,
    ));
  }

  // `requires` is a negotiation, not a hint. Missing a capability is refused.
  if let Some(want) = envelope.get("requires").and_then(|v| v.as_array()) {
    for need in want.iter().filter_map(|v| v.as_str()) {
      if !CAPABILITIES.contains(&need) {
        return Ok(error_envelope(
          "unsupported",
          &format!("this renderer cannot satisfy `{need}`; it offers: {}", CAPABILITIES.join(", ")),
          started,
        ));
      }
    }
  }

  // Template: by name from the renderer roots, or inline source.
  let template = envelope.get("template").cloned().unwrap_or(serde_json::Value::Null);
  let name = template.get("name").and_then(|v| v.as_str()).map(String::from);
  let source = template.get("source").and_then(|v| v.as_str()).map(String::from);
  if name.is_none() && source.is_none() {
    return Ok(error_envelope("error", "template needs a name or a source", started));
  }

  // Context: inline, or an address this component resolves from the shared KV store. The address is
  // the reason the payload never crosses the component boundary.
  let context = match resolve_context(envelope.get("context")) {
    Ok(c) => c,
    Err(message) => return Ok(error_envelope("error", &message, started)),
  };

  let t_render = Instant::now();
  let rendered = render::with(|guard| match (&name, &source) {
    (Some(n), _) => guard.render(n, &context),
    (None, Some(s)) => guard.render_string(s, &context),
    _ => unreachable!("checked above"),
  });

  match rendered {
    Ok(body) => {
      let out = serde_json::json!({
        "aa_render": ENVELOPE,
        "status": "ok",
        "body": body,
        "content_type": "text/html; charset=utf-8",
        "diagnostics": {
          "renderer": "minijinja",
          "template": name.unwrap_or_else(|| "<inline>".to_string()),
          "template_ms": t_render.elapsed().as_millis() as u64,
          "total_ms": started.elapsed().as_millis() as u64,
          "bytes": body.len(),
        },
      });
      let payload = serde_json::to_string(&out).map_err(|e| HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, e))?;
      Ok(payload.into_response())
    }
    Err(e) => Ok(error_envelope("error", &e, started)),
  }
}

/// Inline context, or a KV address resolved here.
fn resolve_context(ctx: Option<&serde_json::Value>) -> Result<String, String> {
  let Some(ctx) = ctx else {
    return Ok("{}".to_string());
  };
  // An address is preferred over an inline payload: it keeps the body off the wire.
  if let Some(addr) = ctx.get("address") {
    let key = addr
      .get("key")
      .and_then(|v| v.as_str())
      .ok_or_else(|| "context address needs a key".to_string())?;
    let mut store = Store::open().map_err(|e| format!("kv open failed: {e}"))?;
    let bytes = store
      .get(key)
      .map_err(|e| format!("kv get failed for {key}: {e}"))?
      .ok_or_else(|| format!("no document at kv key {key}"))?;
    // Best effort: a spool entry that outlives its one reader is a leak, not an error.
    let _ = store.delete(key);
    return String::from_utf8(bytes).map_err(|e| format!("context at {key} is not UTF-8: {e}"));
  }
  if ctx.is_object() || ctx.is_array() {
    return Ok(ctx.to_string());
  }
  // A bare string is the legacy shorthand for the whole context.
  match ctx.as_str() {
    Some(s) => Ok(s.to_string()),
    None => Err("context must be an object, a string, or an address".to_string()),
  }
}

export!(Endpoints);
