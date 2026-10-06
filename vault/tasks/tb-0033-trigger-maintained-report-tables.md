---
title: tb-0033 — Trigger-maintained Tier 2 report tables (step 17)
type: task
status: skipped
priority: high
created: 2026-10-06
tags: [trailbase, reports, sql, materialised-tables, triggers, performance, step-17, skipped]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[component-split-and-sql-materialised-tables]]", "[[report-cost-on-a-whole-database]]", "[[invoice-document-write-through-and-rebuild]]", "[[invoice-doc-sync]]", "[[tb-0027-materialised-invoice-documents]]", "[[materialised-store-cannot-be-a-separate-database]]", "[[money-is-2dp-everywhere]]", "[[guest-report-performance-options]]", "[[tb-0015-integer-cents-for-money]]"]
---

# tb-0033 — Trigger-maintained Tier 2 report tables (step 17)

> **SKIPPED 2026-10-06 — the premise was wrong.** This task was created from
> [[report-cost-on-a-whole-database]] §2, which claimed six of the fourteen **report SQL statements**
> took 17–29 s. **Re-measured directly against the depot, that is false**: every statement runs in
> **~0.05–1.2 s** (`node tools/report-sql-time.mjs --from 2024-01-01 --to 2026-10-04 --repeat 5`), and
> the tool's own verdict is "no statement exceeds 20 s on its own". **SQL was never changed** for this
> and never needed to be: the slowness the sweep measured was **JS reprocessing in the route
> handlers** — the route re-running work the statement had already done, i.e. the `[mview] hydrate` of
> views it never read — removed **2026-10-03** in `d8b5a8e3` (`tb-0032` step 3). With that gone the
> reports answer inside the WASM deadline, so there is nothing to materialise for performance. The body
> below is kept as the record of what was proposed and why, not as work to do.

## Why this was the critical path (withdrawn)

Measured 2026-10-04 on a whole-database import — [[report-cost-on-a-whole-database]] — **six of the
fourteen report statements exceed the ~20 s WASM call deadline on their own**, before any host overhead:
`ledgers/booker` 29.1 s, `ledgers/party` 20.6 s, `reports/itemsales` 17.7 s, `ledgers/area` 17.5 s,
`reports/paymentsbycompany` 17.2 s, `reports/outstanding` 15.5 s.

The cost is **the shared `prelude.sql`**, not any one report. Every payments-reporting statement pays for
`payments_base` / `payments_view` over 26,525 rows, and `payments_base` carries
`WHERE p.invoice IS NULL OR p.invoice IN (SELECT id FROM committed)` — a per-row membership test against a
subquery, on the largest table. The four biggest statements all join the same chain. One real
`O(rows × dates)` term was already removed from `ledgers/party`
([[ledger-party-correlated-balance-was-the-whole-cost]]) and it was worth ~9%, which is the point: the
per-report shape was not the problem.

This is open **decision 2**, [[component-split-and-sql-materialised-tables]] §2: report results move into
**trigger-maintained materialised tables** ("Tier 2"). That satisfies `reports.no_precomputation`, because a
trigger-maintained table is maintained in the **same transaction** as the write and therefore cannot
disagree with its base table — it is not precomputation, which is a timer/TTL refresh.

## The pattern already exists: `inv_doc`

Tier 2 is realised once already: `inv_doc`, one document per invoice, maintained by 14
`AFTER INSERT/UPDATE/DELETE` triggers, rebuildable on demand through the durable job queue. Follow
[[invoice-document-write-through-and-rebuild]] and its harness [[invoice-doc-sync]] exactly. Two things
there are the **general case**, not the invoice case:

- a trigger body is a **copy** of the build statement (SQLite cannot call a stored statement from a
  trigger), so the copies are **machine-checked against the original**, never trusted;
- a rename on a denormalised field **re-derives** the affected rows rather than patching the field,
  because a patch is a second copy of the document's field list.

## Constraints (fixed, do not re-litigate)

1. **Same database, separate tables.** A trigger cannot write to an attached database — SQLite rejects
   qualified table names inside a trigger, and cross-database atomicity is not guaranteed in WAL mode
   ([[materialised-store-cannot-be-a-separate-database]]). The table lives in the main DB beside its base
   tables.
2. **Not precomputation.** Tier 2 is trigger-maintained. Tier 3 (the rendered-page cache and the KV result
   cache) is the **only** tier a manual invalidation may touch; `service.invalidate()` dropping Tier 2
   synchronously after every management write is retired.
3. **Money rounding stays in SQL, once** ([[money-is-2dp-everywhere]]). The integer-cents migration was
   declined — [[tb-0015-integer-cents-for-money]] is closed as re-scoped (the drift lives in the per-unit
   columns, where cents would be wrong) — so the representation stays `REAL` + `printf('%.2f')`.
4. The dependency graph is **generated from the trigger definitions**, never hand-maintained; a manifest
   references materialised table **names**, not the graph.

## First step (bounded — do this before anything else)

Materialise the **shared payments chain** — `payments_base` → `payments_view` (`prelude.sql` ~lines
213–272) — as one Tier 2 table, because every payments-reporting statement joins it and it is the measured
cost:

1. Write the **build statement** — the prelude's `invoice_chain` / `invoice_totals` / `payments_base` /
   `payments_view` chain, ending at the table's column list.
2. Create the table and the `AFTER INSERT/UPDATE/DELETE` triggers on `payments`, `invoices` and
   `transactions` that keep it current, with the trigger bodies derived from the build statement and
   **machine-checked** against it.
3. Rewire `prelude.sql`'s `payments_base` / `payments_view` to `SELECT … FROM <materialised table>`.
4. Add a rebuild path through the durable job queue, as `inv_doc` has.

Then repeat for the other measured chains (`invoice_view` / `line_totals` / `invoice_totals` /
`transactions_report`), one table at a time, each on its own measurement.

## Acceptance

- `trailbase/tools/report-sql-time.mjs` on the whole depot: **all fourteen statements under the ~20 s
  deadline**, with the cold number recorded too (cold is 2–3× warm on a fresh import, so say which is
  measured — see [[report-cost-on-a-whole-database]] §2).
- `trailbase/tools/report-sweep.mjs --guest`: all fourteen answer 200, total well under the recorded
  39.8 s.
- A parity/harness gate in the shape of `invoice-doc-sync.mjs`: every materialised row equals the statement
  recomputed for that row, asserted **after an insert, an update and a delete**.
- `guest-smoke.mjs` green.

## Open questions to settle before writing the migration

- **Scope per table**: one table for `payments_view`, or also `transactions_report` and the invoice chain?
  The measurement says the payments chain is the shared cost; start there and measure again before widening.
- **Trigger fan-out cost**: every `payments`/`invoices`/`transactions` write now maintains a row. Measure
  the write path (and the 60k-row import) before and after — the import must not become quadratic.
- **Rebuild at start-up**: `inv_doc` rebuilds through a job and `ahscripts/init/invoice-doc.js`; the report
  tables need the same, or the first request after a fresh import pays the build (the cold trap measured
  above).
