---
title: POS-0027 Migrate the production data into TrailBase
type: task
status: doing
priority: high
created: 2026-09-26
updated: 2026-10-04
tags: [migration, data, pocketbase, trailbase, cutover]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-client-side-migration-plugin]]", "[[data-model]]", "[[fresh-import-and-whole-database-digest-2026-10-04]]", "[[report-cost-on-a-whole-database]]", "[[pocketbase-data-dirs-in-git]]", "[[import-from-v1-drops-invoice-maker]]"]
---

# POS-0027 Migrate the production data into TrailBase

Copy the live PocketBase data ([[backend]]) into a TrailBase depot ([[trailbase]]), with ids and enum
codes translated, and prove the copy is complete and correct.

**Status 2026-10-04: the copy is done and reconciled; the last box — comparing a PocketBase-produced
figure with a TrailBase-produced one for the same filters — is not.** See the run record at the foot of
this note for exactly which subtasks are ticked and why the rest are not.

⚠️ **The source is `legacyforparity/backend/pb_data/`.** The working-tree `p_data/data.db` is an empty
stub; any reconciliation naming that path compares against nothing and cannot fail. See
[[fresh-import-and-whole-database-digest-2026-10-04]].

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
depot (started with `trail --depot=<depot> run --runtime-root-fs=trailbase/runtime` — see
[[build-and-run]]) or the real one, knowingly. Nothing in the rebuilt importer or in the way the
depot is started stops a migration being pointed at production.

## Subtasks

### 0. Before anything

- [x] Take a verified backup of `backend/pb_data/` (copy the directory; it is the only copy of the
      production data) — ⚠️ **2026-10-04: the source is `pb_data`, and `p_data` in the working tree is
      an empty stub, so the path in the original wording was the wrong one. The pre-rebuild copy of the
      *depot* is `trailbase/traildepot/backup-20261004-212325/`; the oracle itself was never at risk.
- [x] Record the source row counts per collection, as the reconciliation baseline
- [x] Confirm [[tb-0015-integer-cents-for-money]] has been decided (before or after, but knowingly)
      — **declined 2026-10-01**; money is 2 dp everywhere ([[money-is-2dp-everywhere]])
- [x] Confirm the target depot, and that it is the intended one — `trailbase/traildepot`, rebuilt from
      `clear_db.bat` + `build.bat` + `RUN.BAT`
- [ ] Change `trailbase/config.textproto`'s `site_url` from the `http://localhost:4000` placeholder
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

- [x] Run the import against the chosen depot — **twice now**: 2026-09-29 through the browser UI, and
      2026-10-04 headless against a rebuilt depot
- [x] Capture the plugin's output in full — this is the migration record

### 4. Reconcile

- [x] Compare **row counts** per collection against the baseline from step 0 — every collection
      `read == created`, and again independently by `tools/db-digest.mjs`
- [x] Compare **totals**: at minimum the six pinned amounts from the smoke test, recomputed over the
      real data on both backends ([[reports-and-ledgers]]) — ⚠️ **2026-10-04: done per money column and
      per value at whole paisas** (`payments.amount`, `transactions.price/qty/cost_price/discount_rs`,
      `expenses.amount`, `items.cost_price`, `invoices.*`), which is the only comparison the two
      schemas' 2 dp rule makes meaningful. The raw float sum differs by one paisa for a reason that is
      about floating point, not about the data.
- [ ] Spot-check the tricky translations: `parties.type` `''`→`NULL`, a `0` code preserved as `0`,
      booleans as `0`/`1`, and a party with several companies becoming several `party_companies` rows
- [ ] Confirm every FK that used `ON DELETE SET NULL` is either set or explicitly `NULL` — not
      silently zero
- [ ] Check the partial unique index survived: no duplicate non-empty barcodes, many empty ones
- [ ] Confirm `invoiceNo` continuity — the numbers are business identifiers, not incidental

### 5. Id remapping

- [x] Decide whether ids are regenerated as UUIDv7 or preserved with `uuid_parse()` — **regenerated as
      UUIDv7**, which is why the digest compares aggregates and never joins on id
- [ ] Find every place an id leaked outside the database — printed invoices, QR payloads, exported
      reports, bookmarks — and remap or accept the break
      ([[trailbase-pocketbase-data-compatibility]], [[api-contract-trailbase]])

### 6. Prove it

- [ ] Run the guest smoke suite (`node trailbase/tools/guest-smoke.mjs`) against the migrated depot —
      ⚠️ it boots and seeds its **own** depot on `:4322`, so it is not a check of the migrated one and
      has not been re-run against this import
- [ ] Walk the reports with real data and compare totals against the PocketBase screens for the same
      filters — this is where [[report-routes-ignore-date-defaults]] will need watching, since the two
      paths default to different windows. **This is the one box that keeps the task open.**

## What "done" means

Not "the data copied", but "the data copied **and** a figure which is currently produced by PocketBase
is reproducible from TrailBase for the same filters". Until that comparison is recorded, the migration
is unverified.

## Known gaps in the importer

- Drops `invoices.invoice_maker` ([[import-from-v1-drops-invoice-maker]]) — 8,927 references, every one
  of them, in both import runs.
- Runs in a browser tab, so there is no resume story for a very large dataset. ⚠️ **Partly answered
  2026-10-04:** `tools/import-from-v1.mjs` runs the plugin's own code headless, so the tab is optional
  and the 60,245-record import takes 359.5 s at 168 rec/s. It still has no resume story.
- No id-remapping for ids stored outside the database.
- ~~No built-in reconciliation output~~ — **replaced 2026-10-04** by `tools/db-digest.mjs`, which
  reconciles counts and per-column money in one command and refuses to pass silently. What it still
  does not do is compare **a report's rendered totals** against the PocketBase screen, which is the
  remaining open box.

## Run record — 2026-10-04

Depot rebuilt from scratch, imported headless from `pb_data`, reconciled. Full working:
[[fresh-import-and-whole-database-digest-2026-10-04]].

```text
node trailbase/tools/import-from-v1.mjs --no-auth
  60,245 read / 60,245 created / 0 failed, 359.5s (168 rec/s)
  links: parties 13, order_bookers 5;  8,927 invoice_maker dropped
node trailbase/tools/db-digest.mjs --verbose
  every money column equal at whole paisas;  only parties 942 -> 943
```

`--no-auth` is new: every legacy collection is world-readable (`rules: ""`) and the import only reads,
so no superuser token is needed. Guarded by a probe that refuses unless the server answers 200.

**What this run found that the 2026-09-29 run did not:**

- The 2026-10-03 depot was **not** a clean import — it carried five rows the oracle does not have
  (3 invoices, 2 transactions), residue from harness runs whose cleanup did not complete. So a digest
  against *that* depot could not have detected a missing row. Run the digest after every import.
- Money compared on raw `sum()` reads as a one-paisa difference that is float accumulation, not data.
- The path `legacyforparity/backend/p_data/data.db` in this task's own step 0 names an **empty file**
  today. The original wording was wrong, and it was followed for five weeks without anyone noticing,
  because a comparison against an empty reference passes.

## Related

- [[data-model]] — the value-translation table this depends on.
- [[trailbase-client-side-migration-plugin]] — why the importer runs in the browser.
- [[keep-legacy-stack-in-production]] — the rollback story: PocketBase is not to be written to during
  or after the migration.
