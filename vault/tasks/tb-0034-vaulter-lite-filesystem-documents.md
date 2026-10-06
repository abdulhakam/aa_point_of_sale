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

## Storage: TrailBase's file-uploads API, not the filesystem (operator, 2026-10-06)

The sandboxed filesystem is out (see below). Instead each document is stored as a **file row via
TrailBase's file-uploads API** — a `std.FileUpload` column, bytes written to TrailBase's **object
store**, metadata in the column. Mechanism, read from the TrailBase source
(`crates/core/src/records/{params,files}.rs`):

- **Column declaration** (migration): a TEXT column with `CHECK(jsonschema('std.FileUpload', doc))`.
  `std.FileUpload` is one file; `std.FileUploads` is an array of files.
- **Upload** (record API create/update, JSON): the column value is
  `{ "filename": "…", "content_type": "…", "data": "<BASE64URL of the bytes>" }`. With `data` present
  the bytes are written to the object store; with only metadata (`{filename, original_filename,
  content_type, mime_type}`) and no `data` the existing file is left in place — which is how a metadata
  update is a no-op on the bytes.
- **Read**: `GET /api/records/v1/<api>/<id>/<column>` streams the file back
  (`get_uploaded_file_from_record_handler`); `Content-Type` from the stored metadata.
- Storage backend is TrailBase's object store (local, or S3 if configured); the size ceiling is the
  server's body limit (5 MB in `config.textproto`).

### ⚠️ Consequence: the GUEST cannot upload — this changes *who* generates

The object store is **not** reachable from the guest (raw SQL cannot write it, and the sandboxed fs is
read-only), so the bytes can only be written **through the record API over HTTP**. Two options:

- **(G) guest uploads to itself** — the generator calls `http.request("POST",
  "<origin>/api/records/v1/documents", …)` forwarding the triggering request's auth (the host resolves
  `req.user` from a cookie **or** a bearer header). Correct, but nested HTTP through the guest and the
  auth has to be passed through by hand.
- **(T) an external tool uploads** — a node script (`tools/vaulter-lite.mjs`) logs in, reads the depot
  DB, generates the Markdown, and POSTs it to the record API. It runs **outside the sandbox**, so it can
  also write a plain-file mirror if wanted, and it is the same JS the native component later replaces.
  This is the lower-risk path and the one that matches "the JS triggers a native component later".

**Recommendation: (T).** It keeps the guest out of nested HTTP and puts the whole generator in one
place that a future wasm component can mirror. The design below assumes (T); (G) is recorded as the
alternative.

Recommended shape: a `documents` record API — `id`, `collection`, `slug` (the record's UUID, the
filename stem), `updated`, and `doc std.FileUpload`. One row per generated document; `GET
/api/records/v1/documents/<id>/doc` is the document URL. `_meta.json`'s role (dirty detection) moves
into the tool, or into a `documents.updated` comparison.

## Where it used to live, and why the filesystem is out

The guest's filesystem root is `--runtime-root-fs=%DEPOT%\runtime`. The store was to write to
`/vaulter-lite` there.

> ⛔ **BLOCKED and ABANDONED 2026-10-06: the guest fs root is mounted READ-ONLY.** `fs.createDir` /
> `fs.writeFile` fail with **WASI EPERM (os error 63)**; `trail run` exposes only the one
> `--runtime-root-fs` mount, `config.textproto` has no fs option, the upstream CHANGELOG (→ v0.34.4) has
> no writable-root entry, and the `trailbase` **server crate is not available offline** (absent from the
> lock and the cargo cache), so neither a fork nor a custom server binary is buildable here. **Hence
> this task uses the file-uploads API instead** — the same "documents as files" goal, stored in
> TrailBase's object store rather than on disk. The generated JS generator
> (`app/lib/vaulter-lite.js`) and the trigger routes built on 2026-10-06 assumed the filesystem and are
> **superseded** by this; they currently degrade gracefully and should be removed or repointed.
>
> ⚠️ If a plain-file mirror is ever wanted alongside the object store, RUN.BAT `/MIR`-mirrors `runtime\`
> over the root on every start — the store must live outside that mirror (`/XD vaulter-lite` is already
> there, ready).

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
