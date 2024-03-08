// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    // `new_sidecar()` expects just the filename, NOT the whole path like in JavaScript
let (mut rx, mut child) = Command::new_sidecar("pocketbase")
.expect("failed to create `pocketbase` binary command")
.spawn()
.expect("Failed to spawn pocketbase");

tauri::async_runtime::spawn(async move {
// read events such as stdout
while let Some(event) = rx.recv().await {
  if let CommandEvent::Stdout(line) = event {
    window
      .emit("message", Some(format!("'{}'", line)))
      .expect("failed to emit event");
    // write to stdin
    child.write("message from Rust\n".as_bytes()).unwrap();
  }
}
});
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
