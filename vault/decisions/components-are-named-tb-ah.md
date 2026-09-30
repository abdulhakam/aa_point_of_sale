---
title: "The components are named tb-ah-run-js, tb-ah-query-tbdb and tb-ah-render-jinja"
type: decision
status: accepted
decided_on: 2026-09-30
created: 2026-09-30
tags: [components, wasm, naming, trailbase, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[rendering-is-a-component-behind-an-envelope]]", "[[component-split-and-sql-materialised-tables]]", "[[trailbase-loads-multiple-components-flat-router]]", "[[trailbase-src-depot-layout]]", "[[runtime-js-single-host]]", "[[render-split-measured]]"]
---

# The components are named tb-ah-run-js, tb-ah-query-tbdb and tb-ah-render-jinja

## Context

The components grew up under working names — `host`, `host-sql`, `host-renderer`, and the artifacts
`runtime_js.wasm`, `sql.wasm`, `renderer.wasm`. Those name *what they were at the time* rather than
what they are, and `host` in particular says nothing once there are three of them. The owner chose
names on 2026-09-30.

## The names

| Component | Directory | Cargo package | Depot artifact | What it is |
| --- | --- | --- | --- | --- |
| **`tb-ah-run-js`** | `trailbase/tb-ah-run-js/` | `tb_ah_run_js` | `tb-ah-run-js.wasm` | the app host: routing, the runtime-js dispatcher, SQLite, jobs, printing |
| **`tb-ah-render-jinja`** | `trailbase/tb-ah-render-jinja/` | `tb_ah_render_jinja` | `tb-ah-render-jinja.wasm` | minijinja behind the `aa_render` envelope |
| **`tb-ah-query-tbdb`** | `trailbase/tb-ah-query-tbdb/` | `tb_ah_query_tbdb` | `tb-ah-query-tbdb.wasm` | data acquisition over TrailBaseDB; experimental |

All three share the `tb-ah-` prefix, so they sort together, and each says what it **runs** rather
than what role it was born with. `tbdb` is TrailBaseDB — the engine underneath — which is what
distinguishes this component from a query component against anything else.

## What the rename does and does not touch

**Renamed:** the three source directories, the Cargo package names (and therefore the build
artefact names), `build.bat`, `.gitignore`, the smoke harness's copy step, and every path reference
in the vault (42 notes).

**Deliberately NOT renamed: the URL spaces.** The renderer still answers on `/render` and the query
component on `/rpc/*`. Those are wire paths, not component names, and changing them would break the
app and the envelope contract for no benefit — the flat axum router makes every URL a global
namespace ([[trailbase-loads-multiple-components-flat-router]]).

**TrailBase identifies components by file**, discovering them by scanning `traildepot/wasm/`. The
artifact name is therefore free — but it is what an operator reads in the startup log
(`Loaded component "traildepot\wasm\tb-ah-run-js.wasm"`), so it carries the component name.

## Consequences

**Accepted**

- The startup log names the components, which matters now there are three.
- `build.bat` builds all three; the query component is a **warning** on failure, not a stop, because
  it exists to be measured and a deployment needs only the host and the renderer.

**Given up / to watch**

- Old notes now name the new paths. The rename was applied mechanically across the vault, so a
  sentence that described a past state ("as of 2026-09-27, `host/` held…") reads in the present
  tense. The dates on those notes are the honest record of when the claim was made.
- A machine that still runs the old artifact names will start with **only** whatever it finds; a
  stale `runtime_js.wasm` beside the new ones would simply load as a fourth component.

## A defect found while renaming

`trailbase/.gitignore` had its Rust build rules **indented by two spaces**, and git treats leading
whitespace in a `.gitignore` line as part of the pattern — so `host/target/` matched nothing, for
the entire life of the file. Build output was only kept out of commits by luck. The rules are now
unindented and verified with `git check-ignore`, and the file says why it matters.

## Evidence

- `build.bat` builds and places all three, with the mapping in its header comment.
- Startup log: three `Loaded component` lines under the new names.
- `git check-ignore` confirms the `target/` rules now match.
- Guest smoke **76/76** after the rename, with the harness pointed at `tb-ah-run-js.wasm`.

## Related

- [[rendering-is-a-component-behind-an-envelope]] — why there are three and not one.
- [[render-split-measured]] — why the renderer is a component but not the default.
