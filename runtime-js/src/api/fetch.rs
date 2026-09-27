// Outbound HTTP bridge for the guest.
//
// The SDK's `fetch` returns only the response body, which is enough to call TrailBase's JSON
// login and read the tokens back — the dispatcher then sets the auth cookies on its own response.
// (A general response-with-headers client is what a `worker` fan-out would need.)

use rquickjs::{Function, Object, Result, Ctx, prelude::Async};
use wstd::http::body::IntoBody;

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    let http = Object::new(ctx.clone())?;
    http.set("postJson", Function::new(ctx.clone(), Async(post_json)))?;
    http.set("request", Function::new(ctx.clone(), Async(request_js)))?;
    globals.set("http", http)?;
    Ok(())
}

/// A response-with-status-and-headers request. Used by the optional worker fan-out, which needs
/// to see whether a dispatched step succeeded. (The login path only needs the body.)
async fn request_js<'js>(ctx: Ctx<'js>, options: Object<'js>) -> Result<Object<'js>> {
    let method: String = options.get("method").unwrap_or_else(|_| "GET".to_string());
    let url: String = options.get("url")?;
    let body: String = options.get("body").unwrap_or_default();

    let mut builder = trailbase_wasm::fetch::Request::builder()
        .method(method.as_str())
        .uri(url);
    if let Some(headers) = options.get::<_, Option<Object<'js>>>("headers")? {
        for entry in headers.props::<String, String>() {
            let (name, value) = entry?;
            builder = builder.header(name, value);
        }
    }
    let request = builder.body(body.into_body()).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;

    let client = wstd::http::Client::new();
    let response = client.send(request).await.map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    let status = response.status().as_u16();
    let headers_out = Object::new(ctx.clone())?;
    for (name, value) in response.headers() {
        headers_out.set(name.as_str(), value.to_str().unwrap_or(""))?;
    }
    let bytes = response.into_body().bytes().await.map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;

    let out = Object::new(ctx)?;
    out.set("status", status)?;
    out.set("headers", headers_out)?;
    out.set("body", String::from_utf8_lossy(&bytes).to_string())?;
    Ok(out)
}

async fn post_json(url: String, body: String) -> Result<String> {
    let request = trailbase_wasm::fetch::Request::builder()
        .method("POST")
        .uri(url)
        .header("content-type", "application/json")
        .body(body.into_body())
        .map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    let bytes = trailbase_wasm::fetch::fetch(request)
        .await
        .map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    Ok(String::from_utf8(bytes).unwrap_or_default())
}
