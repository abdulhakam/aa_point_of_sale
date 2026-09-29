---
title: "trailbase layout: src/ is the source of truth, traildepot/ is generated"
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
tags: [trailbase, layout, build, depot, wasm, structure]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[trailbase]]", "[[build-and-run]]", "[[environment]]", "[[runtime-js-single-host]]", "[[trailbase-flat-source-layout]]"]
---

# trailbase layout: the sources are the truth, traildepot/ is generated

> **Partly superseded on 2026-09-28** — the `src/` indirection was removed: everything now sits
> directly under `trailbase/` (`host/`, `runtime/`, `tools/`, `migrations/`,
> `config.textproto`, `metadata.textproto`). The `traildepot/`-is-generated half of this decision
> still stands, as does the sandbox-root reasoning. The text below is kept as the record of what
> was decided on 2026-09-27; read it as history, not as the current tree. See
> [[trailbase-flat-source-layout]].

## Decision (2026-09-27, as originally taken)

The whole new system lives under `trailbase/`, with a clean source/artefact split:

```text
trailbase/
  clear_db.bat     # reset traildepot/ from src/ (wipes the database)
  build.bat        # build the guest component into traildepot/wasm/
  RUN.BAT          # start the server; auto-runs clear_db + build if the depot is unprepared
  src/             # SOURCE OF TRUTH
    config.textproto
    metadata.textproto
    migrations/
    runtime/       # the frontend (app/ + ahscripts/) — the WASI sandbox root content
    host/          # the Rust guest component (trailbase-wasm + rquickjs + minijinja)
    tools/         # the verification harnesses
  traildepot/      # GENERATED: copies of the above + wasm/ + data/ secrets/ uploads/ backups/
```

- `clear_db.bat` deletes the depot's runtime state (`data`, `secrets`, `uploads`, `wasm`, `backups`)
  and the source copies, then re-copies `src/{config.textproto, metadata.textproto, migrations,
  runtime}` into `traildepot/`.
- `build.bat` runs `cargo build --target wasm32-wasip2 --release` in `src/host/` and copies the
  component to `traildepot/wasm/runtime_js.wasm` (plus the TrailBase auth-UI component when present).
- The server is started by `RUN.BAT` with **`--runtime-root-fs=traildepot/runtime`**.

The former top-level `runtime-js/` directory is retired: its host, frontend and tools moved into
`trailbase/src/`.

## Why

- **One self-contained home.** The new system (server config, migrations, Rust host, frontend,
  harnesses) is one tree instead of a server directory next to a separate `runtime-js/`.
- **The depot is reproducible.** Everything under `traildepot/` except `.gitignore` is generated
  from `src/` by two scripts, so a fresh clone (or a wiped database) is `clear_db.bat` +
  `build.bat` away, and no generated file is committed.
- **The sandbox root is deliberate.** `--runtime-root-fs` is the WASI sandbox root. Pointing it at
  a **subdirectory** (`traildepot/runtime`) keeps the depot's `data/` (the SQLite database) and
  `secrets/` outside the guest's filesystem sandbox; making the depot root the runtime root would
  hand the guest `fs.readFile("/secrets/...")`
  ([[trailbase-guest-wasm-runtime-defaults]]).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep `runtime-js/` as the host+frontend home and only move config/migrations into `trailbase/` | Splits the new system across two top-level directories for no benefit; the tools would reach across trees. |
| Point `--runtime-root-fs` at the depot root and drop the `runtime/` subdirectory | Wider WASI sandbox: the guest could read the depot's `data/` and `secrets/`. |
| Commit the assembled `traildepot/` | It carries the database and secrets and duplicates `src/`; keeps drift possible. |

## Consequences

- `.gitignore` files: `trailbase/.gitignore` ignores the generated depot copies and runtime state;
  `trailbase/src/.gitignore` ignores `host/target/` and `src/.tbdemo-guest/`.
- The harnesses moved to `trailbase/tools/` and were repointed (they now read `src/` for
  config/migrations, `traildepot/wasm/` for the built component, and `src/runtime/` for
  `--runtime-root-fs`). `guest-smoke.mjs` still passes **71/71** from the new layout.
- Vault path references were updated from `runtime-js/{site,tools,src,target}` to
  `trailbase/src/{runtime,tools,host/src,host/target}`.

## Evidence

- `trailbase/clear_db.bat`, `trailbase/build.bat`, `trailbase/RUN.BAT` (2026-09-27).
- `clear_db.bat` assembled `traildepot/` (config + metadata + migrations + runtime) from `src/`, and
  `build.bat` finished in 1m12s and copied `runtime_js.wasm` into `traildepot/wasm/`.
- `node trailbase/tools/guest-smoke.mjs` — **71/71**.

## Related

- [[runtime-js-guest-platform]] — the system this lays out.
- [[build-and-run]] / [[environment]] — the commands and directories.
