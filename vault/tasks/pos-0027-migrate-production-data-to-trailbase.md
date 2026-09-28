---
title: POS-0027 Migrate the production data into TrailBase
type: task
status: todo
priority: high
created: 2026-09-26
tags: [migration, data, pocketbase, trailbase, cutover]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-client-side-migration-plugin]]", "[[data-model]]"]
---

# POS-0027 Migrate the production data into TrailBase

Copy the live PocketBase data ([[backend]]) into a TrailBase depot ([[trailbase]]), with ids and enum
codes translated, and prove the copy is complete and correct.

## Prerequisite

[[pos-0028-decide-cutover-plan]] should settle *whether* a migration is the chosen path, and
[[tb-0015-integer-cents-for-money]] should be decided first, because converting money to integer
cents is a mechanical change on an empty database and a data migration on a full one.

## The tool must be rebuilt first

The importer that did this job lived in the former Node frontend at
`frontend-ssr/plugins/import-from-v1/` (removed 2026-09-27) and is gone from the tree
([[pos-0029-rebuild-v1-import-on-guest]], [[trailbase-client-side-migration-plugin]]). Rebuilt on
the guest, it does the whole job: browser-side, signs in to both servers, writes in dependency order
(masters → link tables → invoices → return references → transactions → payments), translates ids and
enums, expands the JSON-array relations, skips collections the source lacks, and offers a dry run and
an optional clear-first.

So this task is **not** "write the importer" — it is "run it deliberately, measure it, and reconcile
it", once [[pos-0029-rebuild-v1-import-on-guest]] has rebuilt it. The gap is process, not method.

## Aggregation must not be run against production

The depot used for [[runtime-js-guest-platform]]'s development is the *same* depot the migration
would write to, by default. Decide the target explicitly before running anything: either a scratch
depot (started with `trail --depot=<depot> run --runtime-root-fs=trailbase/src/runtime` — see
[[build-and-run]]) or the real one, knowingly. Nothing in the rebuilt importer or in the way the
depot is started stops a migration being pointed at production.

## Subtasks

### 0. Before anything

- [ ] Take a verified backup of `backend/pb_data/` (copy the directory; it is the only copy of the
      production data)
- [ ] Record the source row counts per collection, as the reconciliation baseline
- [ ] Confirm [[tb-0015-integer-cents-for-money]] has been decided (before or after, but knowingly)
- [ ] Confirm the target depot, and that it is the intended one
- [ ] Change `trailbase/src/config.textproto`'s `site_url` from the `http://localhost:4000` placeholder
      if the deployment will generate links

### 1. Accounts first

- [ ] Create every TrailBase user **before** importing, if invoice authorship matters — the importer
      drops `invoices.invoice_maker` ([[import-from-v1-drops-invoice-maker]])
- [ ] Decide whether staff sign in with email (currently `user_identifier: REQUIRE_EMAIL`) or a
      username, and create the accounts accordingly

### 2. Dry run

- [ ] Run the plugin in read-only dry-run mode and capture its report
- [ ] Confirm the collection set it will write matches the 17 tables in [[data-model]]
- [ ] Confirm it skips nothing it should copy, and that no collection is silently missing from the
      source

### 3. Import

- [ ] Run the import against the chosen depot
- [ ] Capture the plugin's output in full — this is the migration record

### 4. Reconcile

- [ ] Compare **row counts** per collection against the baseline from step 0
- [ ] Compare **totals**: at minimum the six pinned amounts from the smoke test, recomputed over the
      real data on both backends ([[reports-and-ledgers]])
- [ ] Spot-check the tricky translations: `parties.type` `''`→`NULL`, a `0` code preserved as `0`,
      booleans as `0`/`1`, and a party with several companies becoming several `party_companies` rows
- [ ] Confirm every FK that used `ON DELETE SET NULL` is either set or explicitly `NULL` — not
      silently zero
- [ ] Check the partial unique index survived: no duplicate non-empty barcodes, many empty ones
- [ ] Confirm `invoiceNo` continuity — the numbers are business identifiers, not incidental

### 5. Id remapping

- [ ] Decide whether ids are regenerated as UUIDv7 or preserved with `uuid_parse()`
- [ ] Find every place an id leaked outside the database — printed invoices, QR payloads, exported
      reports, bookmarks — and remap or accept the break
      ([[trailbase-pocketbase-data-compatibility]], [[api-contract-trailbase]])

### 6. Prove it

- [ ] Run the guest smoke suite (`node trailbase/src/tools/guest-smoke.mjs`) against the migrated depot
- [ ] Walk the reports with real data and compare totals against the PocketBase screens for the same
      filters — this is where [[report-routes-ignore-date-defaults]] will need watching, since the two
      paths default to different windows

## What "done" means

Not "the data copied", but "the data copied **and** a figure which is currently produced by PocketBase
is reproducible from TrailBase for the same filters". Until that comparison is recorded, the migration
is unverified.

## Known gaps in the importer

- Drops `invoices.invoice_maker` ([[import-from-v1-drops-invoice-maker]]).
- Runs in a browser tab, so there is no resume story for a very large dataset.
- No id-remapping for ids stored outside the database.
- No built-in reconciliation output — the counts and totals above have to be gathered by hand.

## Related

- [[data-model]] — the value-translation table this depends on.
- [[trailbase-client-side-migration-plugin]] — why the importer runs in the browser.
- [[keep-legacy-stack-in-production]] — the rollback story: PocketBase is not to be written to during
  or after the migration.
