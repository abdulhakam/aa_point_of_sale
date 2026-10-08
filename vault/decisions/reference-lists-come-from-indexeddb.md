---
title: Dropdown reference lists come from an IndexedDB store synced from the server
type: decision
status: accepted
decided_on: 2026-10-07
created: 2026-10-07
updated: 2026-10-07
tags: [frontend, guest, indexeddb, client-js, dropdowns, refs, freshness, performance]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-minimal-file-authoring-contract]]", "[[quick-create-rides-in-the-form-that-needed-it]]", "[[the-searchable-autocomplete]]", "[[runtime-js-guest-platform]]", "[[guest-fingerprint-refresh]]", "[[guest-report-result-cache]]", "[[data-model]]", "[[tb-0023-guest-feature-parity]]"]
---

# Dropdown reference lists come from an IndexedDB store synced from the server

## Decision

The reference lists behind dropdowns are held **on the client in IndexedDB**, and the dropdown
controls are populated from that store. A server endpoint syncs the store when the data changes; it
is not the per-page source.

The owner asked (2026-10-07) for the legacy "keep server data on the client" behaviour: cache the
base tables usually used in dropdowns — `invoices` (the table, **without** its `transactions` lines),
items/products, parties, order_bookers, areas, sections, companies and the enum tables — so those
fields do not refresh on every navigation, and so a newly created row appears in the relevant
searchable select **without closing/reopening the dropdown or reloading the page**.

## Shape

- **Cache**: one IndexedDB database, one object store per table (keyPath `id`), plus a `meta` store
  holding the synced data version.
- **Source of truth stays the server.** The client store is a cache; reports, writes and totals
  remain SQL on the server. Only list *membership* for pickers is served from IndexedDB.
- **Sync signal**: the report service's data fingerprint (`A.service.dataVersion()`), already used
  for the rendered-page cache and refs — not a hand-rolled `COUNT(*) + MAX(updated)` probe, because
  `invoices.updated` has only two distinct values and such a probe can miss a change
  ([[guest-fingerprint-refresh]]).
- **Endpoint**: `GET /data/refs` returns `{ version, tables }`, ETag-keyed on `version`, auth-gated.
  Tables are read through the same `refs`/`readTable` normalisation the rest of the app uses, so
  base64 ids and booleans cannot drift.
- **Live insert**: the create panel's POST answers the created row as JSON (`POST /quick-create`);
  the client `upsert`s it into IndexedDB, injects the `<option>` into every matching select and lets
  the open autocomplete re-filter in place. The panel's plain form submit is kept as the fallback.
- **Multi-tab**: `BroadcastChannel` so a create in one tab updates the others.

## The rule it bends, explicitly

[[runtime-js-minimal-file-authoring-contract]] says queries/requests should be form methods/actions
and client JavaScript should be minimal. IndexedDB-primary dropdowns are a deliberate exception:
they are a **progressive enhancement**. The server still renders the `<option>`s, so a page with no
JavaScript remains a working form, and the enhancement only replaces the option set once it has
cached data.

[[quick-create-rides-in-the-form-that-needed-it]] makes the create ride in the form submit. That
path is **kept**; the JSON-returning create adds a fetch path used only to avoid the reload, and the
decision note is updated rather than contradicted.

## Consequences

**Accepted**

- Dropdowns open instantly and do not depend on a round trip per page.
- A new row is usable from the screen that created it without a reload.
- One cache to keep honest, not a cache per control.

**Given up / to watch**

- A new client store with its own lifecycle (open, sync, evict, version).
- A second path by which a stale list can be shown; the sync-on-version rule and a
  `visibilitychange` re-check are the mitigation, and a stale list must never be used to
  *validate a write* — the server still checks ids on every write.
- `invoices` is ~8,927 rows; only lookup columns are cached and that store is loaded lazily.

## Built 2026-10-07 (first slice)

- `GET /data/refs` (`ahscripts/routes/data/refs/route.ts`) — the nine `refs.sql` lists, projected to
  the columns a control reads, ETag-keyed on the data version, auth-gated. Measured on the production
  depot: **98 KB**, version `1744819374`, parties 943 / items 207 / bookers 4 / companies 15, and
  `If-None-Match` answers **304**.
- `public/js/refdb.js` — IndexedDB `aa-pos-refdb`, one store per list + a `meta` version; hydrates
  from the cache when the embedded `<meta name="aa-refdb-version">` matches, fetches otherwise;
  repopulates every `select[data-ref]`; exposes `__AA_REFDB__.get/optionsFor/upsert/remove`; syncs
  tabs through `BroadcastChannel`.
- `public/js/autocomplete.js` — listens for `refdb:select` and re-reads the select's options, so a
  new row appears in an **already-open** list in place.
- `public/js/refdb-create.js` + `ahscripts/routes/quick-create/route.ts` — the combobox's create
  panel POSTs the create and injects the row with no reload, **keeping the form-submit fallback**
  (see [[quick-create-rides-in-the-form-that-needed-it]]).
- The `data-ref` attribute names each list. Report filters use `field.source`, entity fields use
  `f.source`, and the hand-written selects carry it explicitly; `refKey` maps the table names to the
  refs keys (`order_bookers`→`bookers`, `party_types`→`partyTypes`, …).
- Gate `tools/refdb-check.mjs` — **11 passed, 0 failed** (cache loads, every annotated select
  matches its store, item options keep `data-price`, a row upserts into an open combobox, the create
  hook and endpoint validation hold, no page errors).

### Hardened after review (2026-10-07)

A code review of the first slice found and fixed four defects before commit:

- **The cache was never reused.** The version guard compared the whole `{key,value}` record to a
  number, so every page re-fetched. `readMeta` now returns the value; `refdb-check` asserts a
  same-version page load reports `data-refdb-source="cache"`.
- **A cross-tab broadcast loop.** The channel handler re-announced every message it received. A
  channel-originated change now goes through `applyRemote` (cache + DOM only, no IDB write, no
  re-announce).
- **A double-create on a failed response.** The fallback wrapped the fetch *and* the cache write, so a
  committed create whose response or IDB write failed fell back to the form and created again. The
  fallback is now gated on the create not having happened.
- **A probe on every page render.** `renderRoute` embedded `dataVersion()`, which probes 17 tables
  when the memo is older than 1.5 s. It now uses a new `dataVersionIfWarm()` that never probes.

Also removed the unused `refdb:change` document event and the unused `AA_AUTOCOMPLETE` global, made
`TABLES`/`COLUMNS` derive from one list instead of being re-declared, and made `patch()` insert or
remove the single changed option instead of rebuilding every matching select (the grid's ~37 item
selects × 207 options). The JS/no-JS create-workspace difference is deliberate and recorded above.

### `invoices` is deferred, with the reason

The owner named the `invoices` table for the cache. It is **not in this slice**: its only dropdown is
`/payments/new`'s open-invoice picker, which is a computed unpaid/balance list over `payments` too —
caching the base table would not serve that control, and a store with no consumer is dead weight. It
gets its own slice together with the `payments` list it depends on.

## Evidence

- `trailbase/runtime/app/sql/refs.sql` — the definition of the nine reference lists.
- `trailbase/runtime/app/lib/refs.js` — the server-side loader this mirrors.
- `trailbase/runtime/ahscripts/routes/invoice/context/route.ts` — the ETag/version JSON endpoint
  pattern `GET /data/refs` follows.

## Related

- [[the-searchable-autocomplete]] — the control that consumes the store.
- [[quick-create-rides-in-the-form-that-needed-it]] — the create path that feeds it.
- [[parity-reinstates-the-legacy-look-with-defect-fixes]] — the look mandate this runs alongside.
