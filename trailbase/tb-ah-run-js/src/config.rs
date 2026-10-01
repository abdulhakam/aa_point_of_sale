use serde::Deserialize;
use std::path::Path;
use std::sync::OnceLock;

/// The app's routing mode, read once at server start from `/app/config/app.config.json`.
///
/// Two modes, and the choice is the app's, not the host's:
///
///   `crawler`     Only per-URL route folders answer. `/hello` is served by
///                 `ahscripts/routes/hello/route.ts` and by nothing else. There is no catch-all, so
///                 a path with no folder of its own is a 404. This is the strict reading of "a route
///                 is a folder", and it is the mode for hosting a different frontend: the host serves
///                 whatever folders it finds and holds no opinion about the app.
///
///   `dispatcher`  A single catch-all handles every path that has no route folder of its own.
///                 This is how the current app works — `/reports/<key>`, `/management/<entity>` and
///                 `/p/<slug>` are all dynamic, so they cannot be URL folders.
///
/// The default is `dispatcher`, so a missing or unreadable config file changes nothing.
///
/// This is MECHANISM, not policy: it names no route, no page and no business rule. Which folders and
/// which dispatcher are the app's business, in its own files.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Crawler,
    Dispatcher,
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub mode: Mode,
    /// The catch-all script, used only in `dispatcher` mode.
    pub dispatcher: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            mode: Mode::Dispatcher,
            dispatcher: "/ahscripts/routes/_app/route.ts".to_string(),
        }
    }
}

const CONFIG_PATH: &str = "/app/config/app.config.json";

/// The raw shape on disk. Only `mode` is a closed set; `dispatcher` is a path, so it is a `String` and
/// is validated by whether the file exists rather than by an enum.
#[derive(Deserialize)]
struct OnDisk {
    mode: Option<String>,
    dispatcher: Option<String>,
}

static CONFIG: OnceLock<AppConfig> = OnceLock::new();

/// The config, read once. A missing, unreadable or malformed file yields the defaults, because a
/// deployment that has not opted into anything should behave exactly as it did before the file
/// existed.
pub fn get() -> &'static AppConfig {
    CONFIG.get_or_init(load)
}

fn load() -> AppConfig {
    let fallback = AppConfig::default();
    let Ok(bytes) = trailbase_wasm::fs::read_file(Path::new(CONFIG_PATH)) else {
        println!("app config: {CONFIG_PATH} not found, using {:?}", fallback.mode);
        return fallback;
    };
    let Ok(text) = String::from_utf8(bytes) else {
        eprintln!("app config: {CONFIG_PATH} is not UTF-8, using the default mode");
        return fallback;
    };
    let Ok(seen) = serde_json::from_str::<OnDisk>(&text) else {
        eprintln!("app config: {CONFIG_PATH} is malformed, using the default mode");
        return fallback;
    };

    let mode = match seen.mode.as_deref().map(str::trim) {
        None | Some("") => Mode::Dispatcher,
        Some("crawler") => Mode::Crawler,
        Some("dispatcher") => Mode::Dispatcher,
        Some(other) => {
            // An unrecognised mode must NOT silently become the catch-all, because that is the more
            // permissive of the two. Fall back to the default and say so.
            eprintln!("app config: unknown mode \"{other}\", using dispatcher");
            Mode::Dispatcher
        }
    };

    let dispatcher = seen
        .dispatcher
        .map(|d| d.trim().to_string())
        .filter(|d| !d.is_empty())
        .unwrap_or(fallback.dispatcher);

    AppConfig { mode, dispatcher }
}

/// Whether a catch-all may answer a path that has no route folder of its own.
pub fn catch_all_allowed() -> bool {
    get().mode == Mode::Dispatcher
}

/// The catch-all script, or `None` in crawler mode.
pub fn dispatcher() -> Option<&'static str> {
    if catch_all_allowed() {
        Some(get().dispatcher.as_str())
    } else {
        None
    }
}
