---
title: tb-0034 — vaulter-lite: a filesystem markdown document store
type: task
status: todo
priority: high
created: 2026-10-06
tags: [trailbase, documents, markdown, filesystem, vaulter, invoices, jobs, wasm]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-document-write-through-and-rebuild]]", "[[tb-0027-materialised-invoice-documents]]", "[[jobs-in-process-durable-queue]]", "[[runtime-js-single-host]]", "[[kv-is-a-handoff-not-a-report-cache]]", "[[tb-0017-adopt-trail-runtime-js]]", "[[tb-0018-port-app-host-on-runtime-js]]"]
---

# tb-0034 — vaulter-lite: a filesystem markdown document store

## What it is

A filesystem-backed document store, **derived from the database**, laid out exactly like this vault
(`vault/` is the model): a root directory whose **subdirectories are collections**, one **markdown file
per record**, named by the record's database id (the UUIDv7, so the directory listing is already in id
order with no index).

- **Frontmatter = the structured data** — the record's columns, with foreign keys written as
  **wikilinks** (`[[parties/<uuid>]]`), so the store is a graph the way the vault is.
- **Body = the complete human-readable document.** **Only invoices** get a full body (headers, footers,
  invoice lines, ready to print, **with the invoice's related payments listed below it**). Every other
  collection is frontmatter only — structured data, no prose.
- **Generated at init and refreshed hourly**, not on every request. Both runs are **incremental**:
  only rows that are dirty (added, changed, deleted since the last run) are written or removed — the
  whole store is never rebuilt.

This is the `reports.no_precomputation`-safe kind of materialisation: it is a **view for humans and
tools**, not a cache the app reads back. Nothing in the app serves a screen from it, so a file that is
one hour old cannot make a report stale.

## Why it is wanted

The database is the source of truth, but a shop needs documents it can open, grep, print and archive
without a running server — and a migration target that a later native component can own. It is also the
bridge to the eventual **native WASM component**: the JS generator here is the reference the native one
must match (see "Later: a native component").

## Layout

```text
vaulter-lite/
  invoices/      <uuid>.md   # frontmatter + FULL printable body + related payments
  payments/      <uuid>.md   # frontmatter only
  transactions/  <uuid>.md   # frontmatter only
  parties/       <uuid>.md   # frontmatter only
  items/         <uuid>.md
  …              one directory per collection, one file per row
  _meta.json                 # the run manifest: per collection, the fingerprint it was generated at
```

`_meta.json` is how a run is incremental: it records, per collection, the **fingerprint** (the same
`count:newest updated` the report service already probes) at the last generation. A run re-probes the
fingerprint; an unchanged collection is skipped whole. A changed collection is walked row by row and
only rows whose `updated` differs from the file's frontmatter are rewritten; ids present on disk but
gone from the table are deleted.

## Where it lives, and the blocker that decides it

The guest's filesystem root is **`--runtime-root-fs=%DEPOT%\runtime`** (`RUN.bat`). The store was to
write to **`/vaulter-lite`**, i.e. `%DEPOT%\runtime\vaulter-lite`.

> ⛔ **BLOCKED 2026-10-06: the guest fs root is mounted READ-ONLY.** Implemented and ran — `fs.createDir`
> / `fs.writeFile` fail with **WASI EPERM (os error 63, "Operation not permitted")**, and
> `trail run` exposes only the one `--runtime-root-fs` mount (`trail run --help`), no second writable
> path. Building the host's `fs.createDir`/`fs.removeFile` (they did not exist; added, wasm rebuilt)
> did not help — the mount itself denies writes. **So the generator is written and the trigger routes
> are live, but they degrade gracefully (`{ ok:false, blocked:true }`) instead of writing, and the
> store does not contain a single file yet.**
>
> **Unblock requires one of:** (a) a **writable mount** in `trail run` (a TrailBase change); (b) writing
> the store **through the DB** (SQLite, `inv_doc`-style) and exporting it with a tool run outside the
> sandbox; or (c) a **host bridge** that writes to the depot dir directly.
>
> ### The writable mount (option a) is NOT achievable in this environment — checked 2026-10-06
>
> The operator asked for the writable mount. It cannot be delivered here, for three reasons, all
> verified:
> 1. **`trail` is a prebuilt binary** (`C:\…\instl\trailbase\trail.exe`, v0.34.0) with **no source and
>    no `.git`** — only `trail.exe`, `CHANGELOG.md`, `LICENSE`.
> 2. **There is no flag and no config for it.** `trail run --help` lists exactly one fs mount
>    (`--runtime-root-fs`); `config.textproto`'s `server {}` block has no fs/runtime option; and the
>    upstream CHANGELOG through **v0.34.4** has **no** writable-root/extra-mount entry.
> 3. **A custom server binary can't be built offline.** TrailBase ≥ v0.30.0 allows a custom binary
>    against the `trailbase` library crate, but that crate is **not** in this workspace's `Cargo.lock`
>    (0 matches) and **not** in the cargo registry cache (only `trailbase-wasm`, `trailbase-sqlvalue`,
>    `trailbase-wasm-common` are present). A `--offline` build cannot fetch it.
>
> So a writable mount needs **the TrailBase source + network**, on a machine that has them: either (a1)
> a one-line fork setting the runtime-root preopen's `DirPerms` to writable, or (a2) a custom server
> binary that mounts the root rw. Both are outside this repo. **Recommended fallback that works
> offline: option (b)** — the guest keeps its JS incremental generator but writes each document into a
> SQLite table, and a small external tool (node, outside the sandbox) materialises the `vaulter-lite/`
> files from it; the guest's logic and the file format are unchanged, only the final `writeFile` moves
> out of the sandbox.

⚠️ **And even with a writable mount, RUN.BAT mirrors `runtime\` onto `%DEPOT%\runtime` with
`robocopy /MIR` on every start**, and `/MIR` makes the destination match the source *exactly* — so a
generated `vaulter-lite\` under the runtime root would be **deleted on the next server start**. That
`/XD vaulter-lite` exclusion is already added to `RUN.bat`, ready for when (a) lands.

## Components

1. **`app/lib/vaulter-lite.js`** — the generator. `generate(db, { full })`:
   - reads `_meta.json`, re-probes each collection's fingerprint, skips unchanged collections;
   - walks changed collections, writes/rewrites only dirty rows, deletes vanished ids;
   - renders frontmatter (columns; FKs as `[[<collection>/<uuid>]]`; money as-is — 2 dp already), and
     for **invoices only** appends the body.
   - `full: true` ignores the manifest and rewrites everything (a repair button).
2. **The invoice body** — reuses the materialised **`inv_doc`** document ([[tb-0027-materialised-invoice-documents]])
   for the header/footer/lines, plus a **payments** section read from `payments` for that invoice. It is
   the same data the `/invoices/<id>/view` document shows, rendered as markdown instead of HTML — so the
   printable Markdown and the printable page cannot disagree.
3. **Triggers:**
   - **at init** — `ahscripts/init/vaulter-lite.js`, a `.js` init script (the host runs `/ahscripts/init`
     at context creation, `runtime.rs`). The directory does not exist yet; create it. Follow
     `invoice-doc.js`'s pattern (a fresh context evals the implementation and calls the same `generate`).
   - **hourly** — a **time-gated step inside the existing minutely poll** (`jobs.reconcile` → a check of
     "has an hour passed since `_meta.json`'s `lastRun`?"), so no host scheduler change is needed. This
     is the same shape as [[jobs-in-process-durable-queue]]'s queue; the gate lives in JS.
4. **A manual trigger** — `POST /vaulter-lite/regenerate` (admin) and `GET /vaulter-lite` (status: last
   run, per-collection counts), so it can be run and inspected without waiting for the hour. This is also
   how the smoke verifies it.

## Later: a native component

The JS generator is the reference. When the native WASM component exists, it is a **function the JS
triggers** (the user's words) that does the same walk-and-write with the same frontmatter contract, and
the JS keeps only the trigger and the config. Nothing in the store's *format* may depend on which side
generated it, so the format is fixed here, in the task, not in the implementation.

## Acceptance

- Init and hourly both run incrementally: a second run with no writes rewrites **zero** files, and a
  single row update rewrites **one**.
- An invoice `.md` prints (headers, footer, lines, its payments below) and carries `[[wikilink]]` FKs in
  frontmatter that resolve to the other records' files.
- A deleted row's file is removed; a new row's file appears.
- `guest-smoke.mjs` green, plus a check that `POST /vaulter-lite/regenerate` writes an invoice file that
  contains its invoice number and a payment line.
- The store survives a server restart (the `RUN.bat` `/XD` exclusion in place).
