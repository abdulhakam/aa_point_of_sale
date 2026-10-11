---
title: "pos-0031 distributable build (dist.ps1 / dist.bat)"
type: task
status: done
priority: medium
created: 2026-10-11
updated: 2026-10-11
tags: [migration, distribution, packaging, control-panel, trailbase, release, done]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[control-panel]]", "[[pos-0030-control-panel-gui-importer]]", "[[v1-direct-import-tool]]", "[[build-and-run]]", "[[trailbase]]"]
---

# pos-0031 distributable build (dist.ps1 / dist.bat)

**Done and verified 2026-10-11.** A script assembles a minimal, runnable distribution into `dist\`
containing only the control panel, the TrailBase binary, and the files the server needs — **126.3 MB**,
versus the multi-GB working tree.

## What it does

`trailbase/dist.ps1` (wrapped by `dist.bat`) copies, from `trailbase\`:

- `trail.exe` (from `-Trail`, default `trail` on PATH) and `controlpanel.exe` (from `-Panel`, default
  the built panel) to the dist root;
- `config.textproto`, `metadata.textproto`, `migrations\`, `runtime\` (excluding the generated
  `vaulter-lite`);
- the built guest components (`tb-ah-run-js.wasm`, `tb-ah-render-jinja.wasm`, `tb-ah-query-tbdb.wasm`)
  from `-Wasm` (default `traildepot\wasm`) into `dist\wasm\`;
- a generated `start.bat` launcher and `README.txt`.

Options: `-Out <dir>` (default `dist`), `-Trail`, `-Panel`, `-Wasm`, `-IncludeLegacyData` (also ship
the v1 PocketBase `data.db` under `source-data\` for the Import tab), `-Clean`.

## Size

| Item | Bytes |
|---|---|
| `trail.exe` | 79,620,096 |
| `controlpanel.exe` | 40,719,121 |
| `wasm\` (3 components) | 10,827,749 |
| `runtime\` | 1,121,837 |
| `migrations\` | 151,119 |
| config/metadata/start/README | ~9,250 |
| **TOTAL** | **132,449,166 (126.3 MB)** |

Excluded (the drivers): `target\` (~6 GB), `traildepot\data` + backups (~160 MB), `controlpanel\`
(Go source), the `tb-ah-*\` Rust sources, `tools\`, `Cargo.*`.

## How it runs

The depot is **not** shipped. On first launch `start.bat` seeds `traildepot\` with config, metadata,
migrations, runtime and wasm (no `data\`); the control panel then initialises the database and the
admin user (`trail --depot=traildepot user change-password`, the same bootstrap `RUN.BAT` uses) and
starts the server on `127.0.0.1:4000`.

## Evidence

Built into `trailbase\dist` 2026-10-11: 126.3 MB, contents as above. **Smoke test:** the dist sources
were seeded into a throw-away depot, `dist\trail.exe … user change-password` created `data\main.db`
(exit 0), and `dist\trail.exe … run --address=127.0.0.1:4001` served — `GET /login` 200 (login form
present) and `POST /api/auth/v1/login` 200. The throw-away depot was removed afterwards.

`dist\` is git-ignored.

## Not done / caveats

- The control panel and `trail.exe` are shipped prebuilt; the dist does not include a Rust or Go
  toolchain, so building the components or the panel is out of scope of the dist itself.
- The panel's Import-tab default source path (`legacyforparity\…`) does not exist inside the dist; the
  operator browses to a `data.db` (or use `-IncludeLegacyData` and point at `source-data\data.db`).
