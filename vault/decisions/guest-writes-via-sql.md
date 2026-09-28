---
title: Guest writes go through db.execute; ids are URL-safe base64, BLOBs bound as unhex(hex)
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, management, data, writes]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-app-host-port]]", "[[deterministic-sort-and-sql-reads-in-guest]]", "[[runtime-js-single-host]]"]
---

# Guest writes go through db.execute; ids are URL-safe base64, BLOBs bound as unhex(hex)

## Context

The guest app-host reads the depot's SQLite directly ([[deterministic-sort-and-sql-reads-in-guest]]).
Management needs **writes**, and the guest has no usable HTTP client (the host's `fetch` is a stub)
so it cannot call the record APIs the Node app uses. The Rust SDK does expose
`trailbase_wasm::db::execute`, but the JS bridge only `db.query` (read) and bound every parameter
as **text**.

## Decision

1. **Expose a real write path.** `trailbase/host/src/api.rs` and `api/sqlite.rs` now register
   `db.execute` / `sqlite.execute` / `sqlite.run` on `trailbase_wasm::db::execute` (rows affected),
   instead of aliasing them to the read-only `query`.
2. **BLOB columns are bound as hex and wrapped in `unhex(?)`.** With SQLite ≥ 3.41 (the depot runs
   3.53.2) `unhex()` returns a BLOB, so a text parameter can carry a uuid/FK. `id`, relation
   columns and link-table columns all use this.
3. **INTEGER/REAL columns are bound as text and wrapped in `CAST(? AS INTEGER|REAL)`**, because
   every parameter arrives as text.
4. **Ids are emitted as URL-safe base64** (`URL_SAFE`, padded) instead of standard base64. The
   record API uses that convention, and standard base64 can contain `/`, which breaks the
   management `?edit=<id>` query and `<id>/delete` path. `management.base64ToHex` decodes the
   URL-safe alphabet back to hex for `unhex`.

Management writes are plain `INSERT`/`UPDATE`/`DELETE`; `created`/`updated` come from the schema
defaults and the `AFTER UPDATE` triggers, so the fingerprints the Node service relies on stay
correct. A write calls `invalidate()` on the guest report service so the next read rebuilds.

## Consequences

**Accepted**

- Management create/update/delete works without the record APIs, and without a second HTTP client.
- Ids are URL-safe and match the record API's convention, so they are interchangeable in URLs and
  the differential harness can strip them safely.
- Link tables (`party_companies`, `order_booker_companies`) are synced with direct SQL rather than
  the record API's create/delete calls.

**Given up / to watch**

- **The record APIs' validation, ACLs and hooks are bypassed.** The guest writes raw SQL, so
  anything the record API would enforce (permissions, field validation, expand behaviour) is the
  app's responsibility. The app already gates on `req.user()`, but this is weaker than the record
  API's ACLs and must be revisited before this serves real traffic.
- `CREATE`/`UPDATE` do not use `RETURNING`; the new id is obtained from `SELECT hex(uuid_v7())`
  first, which is one extra round trip per insert.
- The text-only bridge means every numeric/enum parameter needs a `CAST` in the SQL text.

## Evidence

- `trailbase/host/src/api.rs`, `trailbase/host/src/api/sqlite.rs` — the `execute` bridge.
- `trailbase/runtime/app/lib/management.js` — `base64ToHex`, `createRow`/`updateRow`/`deleteRow`,
  `syncLinks`.
- `trailbase/tools/management-check.mjs` — create → list → update → verify → delete → verify for
  sections (hard delete) and items (relation + numeric fields): all checks pass.
- Report parity was unaffected at the time: the Node-vs-guest differential (`guest-parity.mjs`,
  removed with the `frontend-ssr` baseline) was still 14/14 after the id-encoding change.

## Related

- [[guest-app-host-port]] — the app-host port this write path is part of.
- [[deterministic-sort-and-sql-reads-in-guest]] — the read path.
