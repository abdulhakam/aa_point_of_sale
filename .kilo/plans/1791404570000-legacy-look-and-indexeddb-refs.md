# Plan — reinstate the legacy look (with defect fixes) and add an IndexedDB reference store

Owner request, 2026-10-07:

1. **The new UI must look and behave exactly like the legacy UI for the user**, while keeping the
   current logic of doing most calculations in SQL.
2. **Use IndexedDB to hold the important base tables on the client** (invoices table without invoice
   lines, products/items, parties, order_bookers, …) so dropdowns do not need a server round trip,
   and so a newly created row (a new product/party) is inserted into the relevant searchable select
   **without a page refresh or closing/reopening the dropdown**.

Answers already given by the owner this session:

- **Look parity = "exact look, fix legacy defects."** Reinstate the visual direct-shift, but keep the
  corrections already made (proper table headers, friendly column labels, the autocomplete) instead
  of reintroducing legacy bugs (`BOX_SIZE_QTY` headers, tables with no `<th>`).
- **IndexedDB is the primary source** for dropdowns; the server is used to sync the cached base
  tables.

## What this reverses, and what it does not

- Reverses the **visual-freedom** half of `vault/decisions/parity-is-functional-not-visual.md`
  (2026-10-05). That decision's **capability-inventory test survives** — it is still how "every
  legacy capability has a home" is counted.
- Reinstates the look half of `vault/decisions/guest-ui-is-a-direct-shift-of-legacy.md`, **minus its
  byte-faithful clause**: legacy defects are not copied.
- Keeps everything already settled that is not about looks: SQL is the report engine
  (`report-numbers-come-from-sqlite`), the invoice grid's live preview
  (`client-side-live-recalculation`), money is 2 dp (`money-is-2dp-everywhere`), writes go through
  `db.execute` (`guest-writes-via-sql`).

Recorded as new decisions:

- `vault/decisions/parity-reinstates-the-legacy-look-with-defect-fixes.md`
- `vault/decisions/reference-lists-come-from-indexeddb.md`

## Part A — exact legacy look, legacy defects fixed

### A0. Build the comparison harness first (no UI change yet)

The target the legacy *source* is gone; the only descriptions are the frozen compiled bundle run by
`legacyforparity/RUN MINI.BAT` on `:3000` and the captures in
`vault/attachments/legacy-ui/` + `vault/notes/legacy-ui-reference-captures.md`.

- Extend `trailbase/tools/ui-capture.mjs` to drive **both** apps at 1600×900 with the same neutral
  extractor, and write structure + pixels per screen (it already supports `--system both` per
  `ui-parity-discrepancies-2026-10-05`).
- Produce the discrepancy list fresh: the 2026-10-05 list A–I is the starting set, corrected by the
  new mandate (each item is now "fix to match" or "accepted defect-fix carve-out").
- Output: one row per screen, per discrepancy, with the capture as evidence.

### A1. Shared shell (affects every screen — do first)

- Header (`SAMPLE TRADERS` + clock/date), the 80px rail, page ground (`grey-0`), white tiles, blue
  tile labels, borders.
- **Body links back to legacy grey `rgb(73,80,87)`** (guest currently pure black) — systematic.
- Rail: the **six** legacy icons including Logout at the foot; Pages, Plugins and the refresh dot
  move behind the foot menu (keep them, they are guest-only additions the owner wants available).
- Fonts/weights/spacing to match Mantine's rendered metrics.

### A2. Screen-by-screen (each independently gated)

Order chosen so the highest-traffic money screens are checked against legacy first:

1. Reports hub + report screens: filter **modal** behind the glyph *and* the inline row, Mantine-style
   date control (replace native `input[type=date]`), title/period placement, table grid.
2. Invoices list / entry / grid / view / print.
3. Cash memo hub, vouchers, DA, expenses, payments.
4. Management list screens: bare filter row + table (drop the inline create form, count badge and
   card wrappers from the list page — move create to its own affordance), sort arrows, three row
   actions (view / edit / delete).
5. Dashboard: exact tile set/order/icons; drop the `Overview` counters card (and fix the smoke
   assertion that protects it).
6. Login.

### A3. Defect-fix carve-out (do NOT copy legacy)

- Keep friendly column labels (`Company`, `Carton Size`, …) — never `BOX_SIZE_QTY`.
- Keep real `<th>` header cells for accessibility.
- Never ship the truncated `Row acti…` heading.
- Keep the searchable autocomplete and the create-from-the-invoice affordance.

### A4. Gates

- `tools/ui-capture.mjs` diff per screen (structure, not only pixels).
- `tools/guest-smoke.mjs`, `tools/route-snapshot.mjs`, `tools/verify-spool-reports.mjs`,
  `tools/autocomplete-check.mjs`, `tools/hotkey-check.mjs`, `tools/grid-preview-check.mjs`.

## Part B — IndexedDB reference store (`refdb`)

### B1. What is cached

Base tables behind dropdowns and common lookups. The authoritative list is
`trailbase/runtime/app/sql/refs.sql` (nine keys: sections, companies, areas, parties, bookers, items,
partyTypes, invoiceTypes, paymentTypes) **plus the `invoices` base table without its `transactions`
lines** for invoice lookup/linking.

### B2. Server side

- New route folder `trailbase/runtime/ahscripts/routes/data/refs/route.ts`:
  `GET /data/refs` returns `{ version, tables: { key: rows[] } }`.
  - `version` = the data fingerprint already used by the report service (`A.service.dataVersion()`),
    so a management write moves it.
  - Tables read through `A.routeKit.refs()` and `A.data.readTable("invoices")`, so normalisation
    (base64 ids, booleans, ordering) is identical to the rest of the app by construction.
  - `ETag: W/"refdb-<version>"` with `If-None-Match` → `304`.
  - Auth-gated like every other route (`routeKit.userOf` / `loginRedirect`).
- Embed the current `version` in the page shell (`<meta name="aa-refdb-version" content="…">`) so the
  client can decide whether to sync before it fetches.
- Create endpoints (`/management/{entity}/create`, the invoice quick-create handlers) return the
  created row as JSON when the request asks for it (`Accept: application/json` or `?json=1`), while
  the plain form POST keeps its current redirect. One write path, two responses.

### B3. Client side

- New `trailbase/runtime/app/public/js/refdb.js`:
  - IndexedDB database `aa-pos-refdb`, one object store per table (keyPath `id`) + a `meta` store
    (`{ key: "version", value }`).
  - `hydrate()`: if IDB `version` === embedded version, use the cache; otherwise `fetch("/data/refs")`
    with `If-None-Match`, replace the stores, save the version.
  - Public API on `window.__AA_REFDB__`: `get(table)`, `optionsFor(table)`, `upsert(table, row)`,
    `remove(table, id)`, and a `refdb:change` event (`{table, action, row}`).
  - Multi-tab sync through `BroadcastChannel("aa-refdb")`.
  - Freshness: re-check the server version on `visibilitychange`/focus (and after a local write),
    refetch only when it moved.
- Dropdown population: for every `select[data-ref="<table>"]`, replace its `<option>` set from IDB,
  preserving the selected value. Server-rendered options remain in the markup so a no-JS page is
  unchanged; IDB only replaces them once it has data.
- `autocomplete.js`: add a `refdb:change` listener that **rebuilds the control's `options` from the
  native select** and re-filters, so a new row appears in an already-open list without closing it.
  Expose the per-select instance through a small registry.
- Live create: the quick-create / management create JS writes the returned row with
  `__AA_REFDB__.upsert(table, row)`, which injects the `<option>` into every matching select and
  fires `refdb:change`; the control selects the new row. No navigation, no reload.

### B4. Conflicts to record (not to hide)

- `vault/decisions/runtime-js-minimal-file-authoring-contract.md` prefers forms over fetch and as
  little client JS as possible. IndexedDB-primary dropdowns are a deliberate, owner-requested
  exception; the decision note says so, and the no-JS path stays intact.
- `vault/decisions/quick-create-rides-in-the-form-that-needed-it.md` makes the create ride in the
  form submit. The JSON-returning create keeps the form path **and** adds a fetch path for the
  no-reload insert; the note is updated rather than contradicted.
- `invoices` is 8,927 rows; only the columns a lookup needs are cached, and the invoice store is
  loaded lazily on first use rather than blocking hydrate.

### B5. Gates

- New `trailbase/tools/refdb-check.mjs` (headless Chrome):
  - selects are populated from IDB, and equal the server-rendered option set;
  - a `__AA_REFDB__.upsert` inserts an option into an **open** autocomplete without a reload and is
    choosable by keyboard;
  - a management quick-create inserts and selects the row with no navigation;
  - with scripting disabled the server-rendered form still submits.
- Re-run: `guest-smoke.mjs`, `autocomplete-check.mjs`, `route-snapshot.mjs`,
  `verify-spool-reports.mjs`, `db-digest.mjs` (must not contaminate).

## Sequencing

1. Vault decisions + this plan (done 2026-10-07).
2. Part A0 capture harness; produce the fresh discrepancy list.
3. **Part B done 2026-10-07 (first slice).** `/data/refs`, `refdb.js`, the `autocomplete.js`
   in-place refresh, `data-ref` on every searchable select, `refdb-check.mjs` (11 passed),
   `autocomplete-check.mjs` re-run (39 passed; its pinned invoice id was replaced with a discovered
   one), `route-snapshot.mjs` re-run (49 routes, 0 erroring). `invoices` deferred with its reason.
4. **Part B5 done 2026-10-07**: `POST /quick-create` + `refdb-create.js`; the invoice quick-create
   panel injects the row with no reload and keeps the form-submit fallback. The fetch happy path is
   guarded by the fallback and validated at the endpoint (400 on empty); an end-to-end create needs a
   throw-away depot, so it is not submitted against the operator's data.
5. Part A0 capture harness; produce the fresh discrepancy list.
6. Part A1 shared shell.
7. Part A2 screen-by-screen, each gated by A0's diff.

Part B is delivered before Part A's restyle because it is additive and independently testable; the
restyle is the long tail and touches every template.

## Traps (from the vault)

- `trailbase/runtime/` is the source; `traildepot/runtime/` is the git-ignored copy the server
  actually loads. `RUN.BAT` syncs it on start — sync it manually if starting another way.
- The rendered-page cache keys on the code revision and the data fingerprint; a template change may
  serve stale HTML until one moves.
- `invoices.updated` has only two distinct values, so count+max(updated) fingerprints can miss a
  change; refdb sync uses the report service's own version, not a hand-rolled probe.
