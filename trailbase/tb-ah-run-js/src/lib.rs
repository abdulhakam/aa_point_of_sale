#![forbid(clippy::unwrap_used)]
#![allow(clippy::needless_return)]
#![warn(clippy::await_holding_lock, clippy::inefficient_to_string)]

use trailbase_wasm::db::{Value, query};
use trailbase_wasm::http::{
  Html, HttpError, HttpRoute, HeaderValue, IntoResponse, Json, Request, Response, StatusCode,
  header, routing,
};
use trailbase_wasm::job::Job;
// use trailbase_wasm::time::{Duration, Timer};
use trailbase_wasm::{Guest, export};
use trailbase_wasm::fs::read_file;
use std::fs;

mod api;
mod config;
mod runtime;
mod ts_transform;
mod init;
mod jobs;
mod render;
mod spool;

// Implement the function exported in this world (see above).
struct Endpoints;

impl Guest for Endpoints {
  fn http_handlers() -> Vec<HttpRoute> {
    
    // Record server start time to KV store
    // This allows init scripts to run once per server start/deployment
    if let Ok(mut store) = trailbase_wasm::kv::Store::open() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = store.set("server_start_time", now.to_string().as_bytes());
    }

    return vec![
      routing::get("/{*wildcard}", wildcard_handler),
      routing::post("/{*wildcard}", wildcard_handler),
      routing::delete("/{*wildcard}", wildcard_handler),
      routing::patch("/{*wildcard}", wildcard_handler),

      // The root is a HOST concern, not an app one: whether an anonymous visitor is sent to the
      // login page or an authenticated one to the dashboard is a fact the host already knows, and
      // answering it here means it holds in both routing modes rather than only when a catch-all
      // happens to exist. `/{*wildcard}` does not match the empty path, so this route is the only
      // thing that can answer "/".
      routing::get("/", root_handler),

      routing::get("/getscripts", get_scripts_handler),
      routing::get("/count/{table}", count_handler),
    ];
  }

  fn job_handlers() -> Vec<Job> {
    // The host's `ahscripts/jobs` file discovery does not run jobs (see the vault issue
    // trailbase-runtime-js-scheduler-not-running-jobs), so the poller drives the app's own
    // `/jobs/reconcile` route directly. A synthetic user satisfies the app's auth gate.
    //
    // It resolves that path through the SAME generic file router the HTTP path uses, rather than
    // through a catch-all dispatcher file. That is what let tb-0030 step 6 delete `_app/route.ts`:
    // the host holds no app catch-all dependency, so an app that puts a folder at this path gets its
    // queue polled and one that does not gets no poller (and no per-minute failure) — the honest
    // answer for a frontend that brings its own scheduling.
    let Some(route_file) = resolve_route_file("/jobs/reconcile") else {
      println!("queue: no /jobs/reconcile route folder, no poller registered");
      return vec![];
    };
    let route_file = route_file.to_string_lossy().to_string();
    println!("queue: poller route -> {}", route_file);
    return vec![Job::minutely("queue_poller", async move || {
        let request = serde_json::json!({
            "method": "POST",
            "path": "/jobs/reconcile",
            "url": "http://internal/jobs/reconcile",
            "query": "",
            "body": "",
            "headers": {},
            "user": { "id": "system", "email": "system", "username": "system", "csrf_token": "" }
        });
        println!("queue: polling {}", route_file);
        match crate::runtime::run_route(&route_file, "POST", request).await {
            Ok(value) => {
                if let Some(count) = value.get("reconciled").and_then(|v| v.as_u64()) {
                    if count > 0 {
                        println!("queue: reconciled {} step(s)", count);
                    }
                }
            }
            Err(error) => eprintln!("queue reconcile error: {}", error),
        }
    })];
  }
}

export!(Endpoints);

async fn get_scripts_handler(_req: Request) -> Json<serde_json::Value> {
  let mut scripts = Vec::new();

  // Use std::fs to list files. 
  // This maps to WASI readdir.
  // We look in /jscripts.
  if let Ok(entries) = fs::read_dir("/traildepot/ahscripts") {
      for entry in entries {
          if let Ok(entry) = entry {
              let path = entry.path();
              if path.extension().and_then(|s| s.to_str()) == Some("js") {
                  if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                       // Read file using trailbase_wasm::fs::read_file as requested
                       // We pass the full path.
                       if let Ok(bytes) = read_file(&path) {
                           if let Ok(content) = String::from_utf8(bytes) {
                               scripts.push(serde_json::json!({
                                   "filename": filename,
                                   "content": content,
                                   "source": "filesystem"
                               }));
                           }
                       } else {
                           // Fallback or log? TS just ignores errors.
                       }
                  }
              }
          }
      }
  }

  return Json(serde_json::json!({
      "status": "ok",
      "scripts": scripts
  }));
}

fn internal(err: impl std::string::ToString) -> HttpError {
  return HttpError::message(StatusCode::INTERNAL_SERVER_ERROR, err);
}

/// Send an anonymous visitor to the login page and an authenticated one to the dashboard.
///
/// 303 rather than 302 so the browser follows with GET whatever the original verb was. This is
/// answered by the host, so it does not depend on a catch-all existing.
async fn root_handler(req: Request) -> Result<Response, HttpError> {
  let mut response = "".into_response();
  *response.status_mut() = StatusCode::SEE_OTHER;
  response
    .headers_mut()
    .insert(header::LOCATION, HeaderValue::from_static(if req.user().is_some() { "/dashboard" } else { "/login" }));
  Ok(response)
}

/// `GET /count/{table}` — rows in one table. **Authenticated callers only.**
///
/// This was unauthenticated, which let anyone enumerate the shape and size of the database: the
/// table name went straight into the statement, a missing table answered 500 rather than 404, and a
/// real table answered `0` — the endpoint was wrong as well as open.
///
/// The name is still interpolated, because SQLite has no way to bind an identifier and a bound
/// parameter would be a constant string in `FROM`. So the shape is constrained instead: a single
/// bare identifier, which admits no quotes, spaces, semicolons or SQL of any kind. Combined with the
/// auth gate, the endpoint can only count a table that already exists.
async fn count_handler(req: Request) -> Result<Response, HttpError> {
  if req.user().is_none() {
    return Err(HttpError::message(StatusCode::UNAUTHORIZED, "authentication required"));
  }
  let table = req
    .path_param("table")
    .ok_or_else(|| internal("missing {table}"))?;
  if !is_bare_identifier(&table) {
    return Err(HttpError::message(StatusCode::BAD_REQUEST, "not a table name"));
  }

  match query(format!("SELECT COUNT(*) FROM \"{table}\""), []).await {
    Ok(rows) => {
      let Value::Integer(i) = rows[0][0] else {
        return Err(internal("expected integer"));
      };
      return Ok(format!("Got {i} rows\n").into_response());
    }
    Err(_) => {
      // A table that does not exist is a 404, not a 500. The statement is well formed; the thing
      // the caller asked for is not there.
      return Err(HttpError::message(StatusCode::NOT_FOUND, "no such table"));
    }
  }
}

/// A single bare identifier: letters, digits and `_`, and it must start with a letter or `_`.
///
/// This is what makes `format!("... FROM {table}")` safe. Anything with a quote, a space, a
/// semicolon, a dot or a comment marker is refused before it reaches the statement builder.
fn is_bare_identifier(name: &str) -> bool {
  let mut chars = name.chars();
  match chars.next() {
    Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
    _ => return false,
  }
  if !chars.all(|c| c.is_ascii_alphanumeric() || c == '_') {
    return false;
  }
  // `sqlite_` and `trailbase_` are engine internals; an app does not count them.
  !name.starts_with("sqlite_") && !name.starts_with("trailbase_")
}

/// Copy a route's `headers` object (name -> value, or name -> [values]) onto the response.
/// A list is appended, so multiple `Set-Cookie` headers survive.
fn apply_extra_headers(response: &mut Response, json: &serde_json::Value) {
  if let Some(headers) = json.get("headers").and_then(|v| v.as_object()) {
    for (name, value) in headers {
      let Ok(header_name) = header::HeaderName::from_bytes(name.as_bytes()) else {
        continue;
      };
      let push = |response: &mut Response, text: &str| {
        if let Ok(header_value) = HeaderValue::from_str(text) {
          response.headers_mut().append(header_name.clone(), header_value);
        }
      };
      match value {
        serde_json::Value::String(text) => push(response, text),
        serde_json::Value::Array(items) => {
          for item in items {
            if let Some(text) = item.as_str() {
              push(response, text);
            }
          }
        }
        _ => {}
      }
    }
  }
}


/// The request headers the host copies into the guest (the fixed allowlist). Shared by the normal
/// dispatch and the special (`_error`/`_not-found`) dispatch so both see the same request shape.
fn collect_headers(req: &Request) -> serde_json::Map<String, serde_json::Value> {
  let mut headers_map = serde_json::Map::new();
  for name in [
    "content-type",
    "accept",
    "accept-encoding",
    "if-none-match",
    "cookie",
    "host",
    "referer",
    "x-csrf-token",
    "x-requested-with",
  ] {
    if let Some(val) = req.header(name) {
      if let Ok(s) = val.to_str() {
        headers_map.insert(name.to_string(), serde_json::Value::String(s.to_string()));
      }
    }
  }
  headers_map
}

/// The resolved TrailBase user (from the auth_token cookie or bearer header), or JSON null.
fn user_json_of(req: &Request) -> serde_json::Value {
  match req.user() {
    Some(user) => serde_json::to_value(user).unwrap_or(serde_json::Value::Null),
    None => serde_json::Value::Null,
  }
}

/// The request object a SPECIAL handler receives (`_not-found`, `_error`, `_global-error`).
///
/// Always method `GET`: these are framework boundaries the host invokes, not routes a client calls,
/// so there is no verb to preserve. `error` carries the failing handler's message when there is one.
fn special_req(req: &Request, path: &str, error: Option<String>) -> serde_json::Value {
  serde_json::json!({
    "method": "GET",
    "path": path,
    "url": req.url().to_string(),
    "query": req.url().query().unwrap_or(""),
    "body": "",
    "headers": collect_headers(req),
    "user": user_json_of(req),
    "error": error,
  })
}

/// The reserved special handler for `name`, at `routes/_<name>/route.{ts,js}`.
///
/// `None` when the app has not opted in, in which case the host behaves exactly as it did before
/// this convention existed. The `_` prefix marks the folder private: `resolve_route_file` never
/// matches it, so it is not reachable as an ordinary URL.
fn resolve_special_file(name: &str) -> Option<std::path::PathBuf> {
  let dir = std::path::Path::new("/ahscripts/routes").join(format!("_{}", name));
  for ext in ["ts", "js"] {
    let candidate = dir.join(format!("route.{}", ext));
    if candidate.is_file() {
      return Some(candidate);
    }
  }
  None
}

/// Run a reserved special handler and convert its return value to a response.
///
/// `None` when the app supplies none, or when the handler itself failed — the caller decides the
/// fallback, which is what lets `error` fall through to `global-error`.
async fn run_special(name: &str, req_obj: serde_json::Value) -> Option<Response> {
  let file = resolve_special_file(name)?;
  println!("special: {} -> {}", name, file.display());
  match runtime::run_route(file.to_string_lossy().as_ref(), "GET", req_obj).await {
    Ok(json) => Some(response_from_json(json)),
    Err(e) => {
      eprintln!("special {} failed: {}", name, e);
      None
    }
  }
}

/// The response shapes a route (or a special handler) may return:
///   { redirect, status? } -> Location + status (303 default)
///   { text, status? }     -> text/plain
///   { body, contentType, status?, headers? } -> fully controlled
///   { html, status? }     -> text/html
///   anything else         -> application/json
///
/// Extracted so the normal dispatch and the `_error`/`_not-found` dispatch answer identically.
fn response_from_json(json: serde_json::Value) -> Response {
  if let Some(location) = json.get("redirect").and_then(|v| v.as_str()) {
    let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(303) as u16;
    let mut response = "".into_response();
    *response.status_mut() = StatusCode::from_u16(status).unwrap_or(StatusCode::SEE_OTHER);
    if let Ok(value) = HeaderValue::from_str(location) {
      response.headers_mut().insert(header::LOCATION, value);
    }
    apply_extra_headers(&mut response, &json);
    return response;
  }
  if let Some(text) = json.get("text").and_then(|v| v.as_str()) {
    let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(200) as u16;
    let mut response = text.to_string().into_response();
    *response.status_mut() = StatusCode::from_u16(status).unwrap_or(StatusCode::OK);
    response
      .headers_mut()
      .insert(header::CONTENT_TYPE, HeaderValue::from_static("text/plain; charset=utf-8"));
    apply_extra_headers(&mut response, &json);
    return response;
  }
  if let (Some(body), Some(content_type)) = (
    json.get("body").and_then(|v| v.as_str()),
    json.get("contentType").and_then(|v| v.as_str()),
  ) {
    let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(200) as u16;
    let mut response = body.to_string().into_response();
    *response.status_mut() = StatusCode::from_u16(status).unwrap_or(StatusCode::OK);
    if let Ok(value) = HeaderValue::from_str(content_type) {
      response.headers_mut().insert(header::CONTENT_TYPE, value);
    }
    apply_extra_headers(&mut response, &json);
    return response;
  }
  if let Some(html) = json.get("html").and_then(|v| v.as_str()) {
    let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(200) as u16;
    let mut response = Html(html.to_string()).into_response();
    *response.status_mut() = StatusCode::from_u16(status).unwrap_or(StatusCode::OK);
    apply_extra_headers(&mut response, &json);
    return response;
  }
  Json(json).into_response()
}

/// The host's last-resort error page, used only when the app supplies no `_global-error` handler or
/// that handler also failed. A minimal self-contained document, and it echoes no error text.
fn host_error_response() -> Response {
  let body = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">\
<title>Something went wrong</title></head><body>\
<h1>Something went wrong</h1><p>Please try again, or contact your administrator.</p>\
</body></html>";
  let mut response = Html(body.to_string()).into_response();
  *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
  response
}


/// The file-router conventions, in the order a request is matched against them.
///
/// - `/reports/profit`                 → `routes/reports/profit/route.{js,ts}`   (literal)
/// - `/invoices/{id}/header`           → `routes/invoices/{id}/header/route.{js,ts}`
/// - `/static/css/app.css`             → `routes/static/[...path]/route.{js,ts}`
///
/// Precedence at each segment is **literal, then `{param}`, then `[...rest]`**, and `[...rest]` is
/// only honoured as the LAST segment. That order matters and is the reason it is written down rather
/// than left to the walk: a literal directory must win over a `{param}` one, or a future
/// `routes/reports/profit/` would be shadowed by `routes/reports/{key}/` the moment both existed.
///
/// Why this is here at all: the host previously did an exact-path `exists()` and then handed
/// everything else to a single catch-all dispatcher, which is why dynamic paths only worked because
/// `route.ts` grew a branch per URL. See vault/tasks/tb-0030-retire-the-route-ts-dispatcher.md.
///
/// The match is a filesystem walk per request. It is not memoised deliberately: the alternative is a
/// cache of the route tree that can go stale against a runtime directory the app is meant to edit
/// without restarting, and a stale route table is a 404 that only reproduces sometimes.
fn resolve_route_file(clean_path: &str) -> Option<std::path::PathBuf> {
    const ROOT: &str = "/ahscripts/routes";


    let segments: Vec<&str> = clean_path
        .split('/')
        .filter(|s| !s.is_empty())
        .collect();

    // A first segment that is itself a catch-all owns everything below it: `/static/[...path]`.
    let mut dir = std::path::PathBuf::from(ROOT);

    for segment in segments.iter() {
        let mut next: Option<std::path::PathBuf> = None;
        let mut caught_all = false;

        // 1. literal — but never a reserved `_`-prefixed folder (`_not-found`, `_error`,
        // `_global-error`), which the host dispatches by name and which must not be reachable as a
        // normal route. This mirrors Next.js's `_folder` private convention.
        if !segment.starts_with('_') {
            let literal = dir.join(segment);
            if literal.is_dir() {
                next = Some(literal);
            }
        }

        // 2. `{param}` — any single segment
        if next.is_none() {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with('{') && name.ends_with('}') && entry.path().is_dir() {
                        next = Some(entry.path());
                        break;
                    }
                }
            }
        }

        // 3. `[...rest]` — every remaining segment, as ONE match.
        //
        // Not gated on being the last request segment: a catch-all's job is to ABSORB the remainder,
        // so `/static/css/app.css` needs `[...path]` to match at the `css` level, not at `app.css`.
        // The first version required `is_last` here, so `/probe/rest/a/b/c/d.txt` fell through to the
        // dispatcher and returned 404 — and it looked like `[...rest]` was unsupported rather than
        // like the guard was wrong, because `{param}` worked in the same build.
        if next.is_none() {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("[...") && name.ends_with(']') && entry.path().is_dir() {
                        next = Some(entry.path());
                        caught_all = true;
                        break;
                    }
                }
            }
        }

        dir = next?;
        // A catch-all has ABSORBED the rest of the path, so the walk ends here. Without this the loop
        // kept descending for the remaining segments and the match died on the next iteration — the
        // diagnostic showed it had already found
        // `/ahscripts/routes/probe/rest/[...path]` with `is_dir=true`, then walked into it looking for
        // a directory named `a`, found only `route.ts`, and fell through to the dispatcher. So the
        // route WAS resolved and then discarded, which is the worst shape this bug could take.
        if caught_all {
            break;
        }
    }

    for ext in ["ts", "js"] {
        let candidate = dir.join(format!("route.{}", ext));
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}


async fn wildcard_handler(mut req: Request) -> Result<Response, HttpError> {
  let path = req.url().path().to_string();
  // Remove trailing slash if present to avoid double slashes, though /serve//route.js often works.
  let clean_path = if path.ends_with('/') && path.len() > 1 {
      &path[..path.len()-1]
  } else {
      &path
  };

  println!("Path: {}", clean_path);

  // Ensure /ahscripts/routes exists
  if !std::path::Path::new("/ahscripts").exists() {
      let _ = fs::create_dir("/ahscripts");
  }
  if !std::path::Path::new("/ahscripts/routes").exists() {
      let _ = fs::create_dir("/ahscripts/routes");
  }

  let file_path = match resolve_route_file(clean_path) {
      Some(p) => p,
      None => {
          // No route folder owns this path. The app is folder-only since tb-0030 step 6 deleted
          // `_app/route.ts`: every URL is a folder under /ahscripts/routes, so a path with none is a
          // 404. A `dispatcher` catch-all stays a generic capability an app MAY opt into through its
          // config, but the host holds no app route of its own and names no app noun.
          let mut fallback: Option<std::path::PathBuf> = None;
          if let Some(dispatcher) = config::dispatcher() {
              if std::path::Path::new(dispatcher).exists() {
                  fallback = Some(std::path::PathBuf::from(dispatcher));
              }
          }
          match fallback {
              Some(p) => p,
              None => {
                  // A custom 404, if the app supplies one (`routes/_not-found/route.*`). The host
                  // stamps `x-aa-not-found: no_route_folder` so a dev tool can still tell "the app
                  // rendered a 404" from "nothing is mounted here" — the distinction the JSON body
                  // below used to be the only carrier of.
                  if let Some(mut response) =
                      run_special("not-found", special_req(&req, clean_path, None)).await
                  {
                      if let Ok(value) = HeaderValue::from_static("no_route_folder") {
                          response
                              .headers_mut()
                              .insert(header::HeaderName::from_static("x-aa-not-found"), value);
                      }
                      return Ok(response);
                  }
                  // A DISTINCTIVE body, deliberately. The guest's own 404 is `text("Not found", 404)`
                  // in six places, which is byte-identical to what TrailBase renders for an
                  // `HttpError::message(NOT_FOUND, …)`. So a 404 could not be told apart from "this
                  // path has no route folder", and `tools/route-coverage.mjs` had to guess — which is
                  // how it would have reported a moved route as still-working, or a live route as
                  // gone, on a status code that carries no information.
                  //
                  // It also says something useful to whoever hits it: the difference between "the app
                  // answered 404" and "nothing is mounted here" is exactly what a reader of a 404
                  // cannot currently see.
                  let body = serde_json::json!({
                      "error": "no_route_folder",
                      "path": clean_path,
                      "hint": "no route folder under /ahscripts/routes matches this path",
                  })
                  .to_string();
                  let mut response = body.into_response();
                  *response.status_mut() = StatusCode::NOT_FOUND;
                  if let Ok(value) = HeaderValue::from_str("application/json; charset=utf-8") {
                      response.headers_mut().insert(header::CONTENT_TYPE, value);
                  }
                  return Ok(response);
              }
          }
      }
  };

  if std::path::Path::new(&file_path).exists() {
      let method = req.method().to_string().to_uppercase();
      
      // Read body
      let body_bytes = req.body().bytes().await.map_err(internal)?;
      let body_str = String::from_utf8(body_bytes).unwrap_or_default();
      
      let req_obj = serde_json::json!({
          "method": method,
          "path": path,
          "url": req.url().to_string(),
          "query": req.url().query().unwrap_or(""),
          "body": body_str,
          "headers": collect_headers(&req),
          "user": user_json_of(&req),
      });

      // Cloned: the error path below hands the same request object to the `_error` boundary.
      match runtime::run_route(file_path.to_string_lossy().as_ref(), &method, req_obj.clone()).await {
          Ok(json) => {
              return Ok(response_from_json(json));
          }
          Err(e) => {
              // A handler failed. Give the app first refusal: its `_error` boundary, then its
              // `_global-error` boundary, then the host's minimal page. A broken route is a 500 that
              // the app decides how to present — not a bare 404 with no HTML.
              let mut err_obj = req_obj;
              err_obj["error"] = serde_json::Value::String(format!("{}", e));
              if let Some(response) = run_special("error", err_obj.clone()).await {
                  return Ok(response);
              }
              if let Some(response) = run_special("global-error", err_obj).await {
                  return Ok(response);
              }
              return Ok(host_error_response());
          }
      }
  }

  // Fallback for API mock or just 404
  if path.starts_with("/api") {
    let body = serde_json::json!({
        "status": "success",
        "message": "This is a valid API route",
        "path": path
    });
    return Ok(Json(body).into_response());
  }

  let error_body = serde_json::json!({
      "code": 404,
      "message": "Route not found",
      "path": path
  });

  return Err(HttpError::message(StatusCode::NOT_FOUND, error_body.to_string()));
}
