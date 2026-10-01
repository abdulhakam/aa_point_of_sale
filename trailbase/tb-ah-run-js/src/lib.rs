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
      
      routing::get("/getscripts", get_scripts_handler),
      routing::get("/count/{table}", async |req| {
        let table = req
          .path_param("table")
          .ok_or_else(|| internal("missing {table}"))?;

        let rows = query(format!("SELECT COUNT(*) FROM {table}"), [])
          .await
          .map_err(internal)?;

        let Value::Integer(i) = rows[0][0] else {
          panic!("expected integer");
        };

        return Ok(format!("Got {i} rows\n"));
      }),
    ];
  }

  fn job_handlers() -> Vec<Job> {
    // The host's `ahscripts/jobs` file discovery does not run jobs (see the vault issue
    // trailbase-runtime-js-scheduler-not-running-jobs), so the poller drives the app's own
    // `/jobs/reconcile` route directly. A synthetic user satisfies the app's auth gate.
    return vec![Job::minutely("queue_poller", async || {
        let request = serde_json::json!({
            "method": "POST",
            "path": "/jobs/reconcile",
            "url": "http://internal/jobs/reconcile",
            "query": "",
            "body": "",
            "headers": {},
            "user": { "id": "system", "email": "system", "username": "system", "csrf_token": "" }
        });
        match crate::runtime::run_route("/ahscripts/routes/_app/route.ts", "POST", request).await {
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

  let mut file_path = format!("/ahscripts/routes{}/route.js", clean_path);
  
  if !std::path::Path::new(&file_path).exists() {
      let ts_path = format!("/ahscripts/routes{}/route.ts", clean_path);
      if std::path::Path::new(&ts_path).exists() {
          file_path = ts_path;
      }
  }

  // Fallback: a single app dispatcher handles every path that has no route folder of its
  // own (dynamic routes like /reports/<key>, /management/<entity>, /p/<slug>).
  if !std::path::Path::new(&file_path).exists() {
      for candidate in ["/ahscripts/routes/_app/route.ts", "/ahscripts/routes/_app/route.js"] {
          if std::path::Path::new(candidate).exists() {
              file_path = candidate.to_string();
              break;
          }
      }
  }
  
  if std::path::Path::new(&file_path).exists() {
      let method = req.method().to_string().to_uppercase();
      
      // Read body
      let body_bytes = req.body().bytes().await.map_err(internal)?;
      let body_str = String::from_utf8(body_bytes).unwrap_or_default();
      
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

      // The resolved TrailBase user (from the auth_token cookie or bearer header).
      let user_json = match req.user() {
        Some(user) => serde_json::to_value(user).unwrap_or(serde_json::Value::Null),
        None => serde_json::Value::Null,
      };

      let req_obj = serde_json::json!({
          "method": method,
          "path": path,
          "url": req.url().to_string(),
          "query": req.url().query().unwrap_or(""),
          "body": body_str,
          "headers": headers_map,
          "user": user_json
      });

      match runtime::run_route(&file_path, &method, req_obj).await {
          Ok(json) => {
              // Response shapes a route may return:
              //   { redirect: "/path", status? } -> 303 (or status) with Location, empty body
              //   { text, status? }              -> text/plain
              //   { html }                       -> text/html 200
              //   anything else                  -> application/json 200
              if let Some(location) = json.get("redirect").and_then(|v| v.as_str()) {
                  let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(303) as u16;
                  let mut response = "".into_response();
                  *response.status_mut() =
                      StatusCode::from_u16(status).unwrap_or(StatusCode::SEE_OTHER);
                  if let Ok(value) = HeaderValue::from_str(location) {
                      response.headers_mut().insert(header::LOCATION, value);
                  }
                  apply_extra_headers(&mut response, &json);
                  return Ok(response);
              }
              if let Some(text) = json.get("text").and_then(|v| v.as_str()) {
                  let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(200) as u16;
                  let mut response = text.to_string().into_response();
                  *response.status_mut() = StatusCode::from_u16(status).unwrap_or(StatusCode::OK);
                  response.headers_mut().insert(
                      header::CONTENT_TYPE,
                      HeaderValue::from_static("text/plain; charset=utf-8"),
                  );
                  apply_extra_headers(&mut response, &json);
                  return Ok(response);
              }
              // { body, contentType, status?, headers? } — a fully controlled response
              // (static files, JSON with ETag/cache-control, 304s).
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
                  return Ok(response);
              }
              if let Some(html) = json.get("html").and_then(|v| v.as_str()) {
                  let status = json.get("status").and_then(|v| v.as_u64()).unwrap_or(200) as u16;
                  let mut response = Html(html.to_string()).into_response();
                  *response.status_mut() = StatusCode::from_u16(status).unwrap_or(StatusCode::OK);
                  apply_extra_headers(&mut response, &json);
                  return Ok(response);
              }
              return Ok(Json(json).into_response());
          }
          Err(e) => {
              // Return 404 if method not found or other error (simulating "otherwise return 404")
              // Ideally distinguish between "file not found" (handled above) and "method not found".
              return Err(HttpError::message(StatusCode::NOT_FOUND, format!("Route execution failed: {}", e)));
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
