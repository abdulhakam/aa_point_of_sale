---
title: The ahscripts runtime refactor shipped without a wasm rebuild, and did not compile
type: issue
status: resolved
severity: high
created: 2026-10-12
updated: 2026-10-12
tags: [trailbase, wasm, runtime-js, refactoring, build, templates, minijinja]
related_to: ["[[tb-0043-colocate-app-into-ahscripts]]", "[[tb-0044-special-pages]]", "[[runtime-js-single-root-ahscripts]]", "[[runtime-js-special-pages]]", "[[build-and-run]]", "[[runtime-js-guest-platform]]", "[[trailbase-host-js-error-reported-as-404]]"]
---

# The ahscripts runtime refactor shipped without a wasm rebuild, and did not compile

## Symptom

After the 2026-10-12 runtime refactor ([[runtime-js-single-root-ahscripts]]) the running app was dead
on arrival:

- Browser: `Route execution failed: QuickJS library created a unknown error` on every page.
- Control-panel server console: `render error: template not found: template "login/page.html.jinja"
  does not exist`.

## Root cause (two parts, both in `d8a6444`)

1. **The refactor was committed uncompiled.** Its own message records
   "Runtime-unverified in this change: needs `build.bat`". The deployed guest components were
   therefore **pre-refactor**: `traildepot\wasm\tb-ah-run-js.wasm` dated 2026-10-06 and
   `tb-ah-render-jinja.wasm` dated 2026-10-04, while the runtime `ahscripts/` tree was rewritten on
   2026-10-12. Route discovery never moved (`resolve_route_file`'s `ROOT` is `/ahscripts/routes`
   before and after), so the **new** `routes/login/route.ts` executed and asked for
   `login/page.html.jinja`; but the **old** renderer only searched `/app/views` and `/app/pages`
   (`d8a6444~1:tb-ah-run-js/src/render.rs`), where that template no longer lives. Hence
   "template not found", which the host then surfaced as its generic 404
   ([[trailbase-host-js-error-reported-as-404]] — the opaque QuickJS string is the same defect one
   layer down).

2. **The refactored Rust did not compile.** `tb-ah-run-js/src/lib.rs` wrote
   `if let Ok(value) = HeaderValue::from_static("no_route_folder")`. In the pinned
   `trailbase-wasm 0.6.1`, `HeaderValue` is `http::HeaderValue` and `from_static` is infallible
   (returns `HeaderValue`, not `Result`), so the first `build.bat` failed with `E0308`.

The compounding state on disk was a **half-migrated depot**: `trailbase\traildepot\runtime` held the
old `app/` tree **and** an `ahscripts\routes\login\route.ts` with the old `/app/lib/context.js` /
`auth/login.html` content, i.e. a previous copy that never mirrored the new tree wholesale.

## Fix

- `tb-ah-run-js/src/lib.rs`: replace the `if let Ok(value) = HeaderValue::from_static(...)` wrapper
  with a direct `headers_mut().insert(header_name, HeaderValue::from_static("no_route_folder"))`.
- `cmd /c trailbase\build.bat` — rebuilt all three components clean:
  `tb-ah-run-js.wasm` (2026-10-12 20:00), `tb-ah-render-jinja.wasm` (20:01), `tb-ah-query-tbdb.wasm`
  (20:02). The nine `tb_ah_run_js` warnings are pre-existing dead code (`init.rs`, `jobs.rs`).
- Re-mirrored `runtime\` into the depot (`robocopy runtime traildepot\runtime /MIR /XD vaulter-lite`),
  which removed the stale `app/` tree and copied the colocated templates.
- Rebuilt the distributables against the fresh wasm: `aa dist` (`dist\wasm\*` now 2026-10-12) and
  `aa sfx` (`dist\aa-pos.exe`, payload `20261012-200345`).
- **Closed the deployment gap that let this happen.** The control panel's Start mirrored only
  `runtime\` and `migrations\` into the depot, never `wasm\`, so a depot that was seeded once kept
  the old engine while its runtime was refreshed — the exact mismatch above, on upgrade.
  `controlpanel/internal/monitor/monitor.go`'s `syncSources` now mirrors `wasm\` too (only when the
  source root provides it — the source-tree layout keeps the components in `traildepot\wasm`, so a
  missing `<sourceRoot>\wasm` is skipped, not fatal), and the UI toggle reads "Sync runtime +
  migrations + wasm before start". The panel was rebuilt (`panelbuild`) and `dist\controlpanel.exe`
  / `dist\aa-pos.exe` re-emitted (`payload 20261012-201711`).

## Verification (live, 2026-10-12)

`trail --depot=trailbase\traildepot run --address=127.0.0.1:4099 --runtime-root-fs=trailbase\traildepot\runtime`
with a real depot:

| Request | Result |
|---|---|
| `GET /login` | **200**, 2648 bytes, rendered shell (`<title>Log in · SAMPLE TRADERS`), no error text |
| `GET /` , `/dashboard` , `/reports/profit` | 303 (auth redirect — expected when logged out) |
| `GET /static/css/theme.css` | 200 |
| server console | no `render error`, no `Route execution failed`; all three components load |

## Evidence

- `git show d8a6444` — message "needs `build.bat`"; `render.rs` root diff `/app/views`,`/app/pages`
  → `/ahscripts/routes`,`/ahscripts/views`,`/ahscripts/pages`.
- `git show d8a6444~1:trailbase/tb-ah-run-js/src/lib.rs` — `ROOT: &str = "/ahscripts/routes"`
  unchanged, which is why route discovery worked against the new tree while rendering did not.
- `tb-ah-run-js/src/lib.rs:525` — the `E0308` site; fixed here.
- File mtimes: wasm 2026-10-06/10-04 vs runtime `ahscripts/` 2026-10-12; depot `app/` alongside
  `ahscripts/routes/login/route.ts` (old content) until the mirror.
