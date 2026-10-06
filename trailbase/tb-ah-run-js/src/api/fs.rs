use rquickjs::{Function, Object, Result, Ctx, prelude::{Async, Opt}};
use trailbase_wasm::fs::read_file;
use std::path::Path;

pub fn init(ctx: &Ctx<'_>) -> Result<()> {
    let globals = ctx.globals();
    let fs = Object::new(ctx.clone())?;

    fs.set("readFile", Function::new(ctx.clone(), Async(read_file_js)))?;
    fs.set("writeFile", Function::new(ctx.clone(), Async(write_file_js)))?;
    // `mkdir -p`. `writeFile` is `std::fs::write`, which does NOT create parent directories, so a
    // generator that writes `<root>/<collection>/<id>.md` needs this first. Recursive, and idempotent
    // (an existing directory is a success), which is what `std::fs::create_dir_all` gives. Added for
    // tb-0034's filesystem document store; mechanism only — it names no directory.
    fs.set("createDir", Function::new(ctx.clone(), |path: String| -> bool {
        std::fs::create_dir_all(&path).is_ok()
    }))?;
    // `unlink`, so an incremental run can remove a document whose row is gone. Returns false when the
    // path is already absent, so a delete is idempotent (tb-0034).
    fs.set("removeFile", Function::new(ctx.clone(), |path: String| -> bool {
        match std::fs::remove_file(&path) {
            Ok(()) => true,
            Err(e) => e.kind() == std::io::ErrorKind::NotFound,
        }
    }))?;
    // Implement others as needed: exists, readdir
    
    // Simple exists implementation using std::fs::metadata/exists since trailbase_wasm might just use WASI fs
    fs.set("exists", Function::new(ctx.clone(), |path: String| -> bool {
         Path::new(&path).exists()
    }))?;

    fs.set("readdir", Function::new(ctx.clone(), |path: String| -> Result<Vec<String>> {
        let mut entries = Vec::new();
        if let Ok(iter) = std::fs::read_dir(path) {
            for entry in iter {
                if let Ok(entry) = entry {
                    if let Ok(name) = entry.file_name().into_string() {
                        entries.push(name);
                    }
                }
            }
        }
        Ok(entries)
    }))?;

    globals.set("fs", fs)?;
    Ok(())
}

async fn read_file_js<'js>(ctx: Ctx<'js>, path: String, options: Opt<rquickjs::Value<'js>>) -> Result<rquickjs::Value<'js>> {
    // Check if options has encoding: 'utf8' (default) or 'binary'
    // For now assuming utf8 return string, unless specified?
    
    let path_ref = std::path::PathBuf::from(path);
    let bytes = read_file(&path_ref).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?; // map error
    
    // Return string by default
    if let Some(val) = options.0 {
         // Check encoding? For now just string.
         if let Some(obj) = val.as_object() {
              if let Ok(enc) = obj.get::<_, String>("encoding") {
                   if enc == "binary" {
                       // Return bytes (ArrayBuffer/Uint8Array not easily constructible without context?)
                       // Actually we can return Vec<u8> which rquickjs converts? No.
                       // Need to check rquickjs docs or just map to string for now.
                   }
              }
         }
         // Need context to create string
         let ctx = val.ctx();
         let s = String::from_utf8(bytes).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
         return Ok(rquickjs::Value::from_string(rquickjs::String::from_str(ctx.clone(), &s)?));
    }

    // Capture context somehow? We don't have it if options is None.
    // Argument needs Ctx.
    let s = String::from_utf8(bytes).map_err(|e| { eprintln!("bridge error: {e}"); rquickjs::Error::Unknown })?;
    return Ok(rquickjs::Value::from_string(rquickjs::String::from_str(ctx, &s)?));
}

async fn write_file_js<'js>(ctx: Ctx<'js>, path: String, content: String) -> Result<()> {
    // For now simple string write
    let path_ref = std::path::PathBuf::from(path);
    std::fs::write(&path_ref, content).map_err(|e| {
        let exc = rquickjs::Exception::from_message(ctx, &e.to_string()).unwrap();
        exc.throw()
    })?;
    Ok(())
}
