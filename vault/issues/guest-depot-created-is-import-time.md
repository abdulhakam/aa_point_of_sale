---
title: The production-data depot has created overwritten with the import timestamp
type: issue
status: verified
severity: high
created: 2026-09-27
tags: [migration, import, data-integrity, reports, dates, depot]
related_to: ["[[data-model]]", "[[reports-and-ledgers]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[guest-vs-legacy-report-performance]]"]
---

# The production-data depot has `created` overwritten with the import timestamp

## What happens

The guest compares reports against the record's `created`. On the production-sized depot
(`trailbase/traildepot`, 8,927 invoices / 23,413 transactions / 26,526 payments) **every row's
`created` is the 2026-09-26 import time**, not the original business timestamp. The legacy source
keeps the real values.

Verified 2026-09-27 by direct SQL on both databases:

| field | legacy `backend/p_data/data.db` | guest depot `trailbase/traildepot/data/main.db` |
|---|---|---|
| `invoices.created` | 2024-02-17 … 2026-04-11 | 2026-09-26 08:30:54 … 08:30:56 |
| `transactions.created` | 2024-02-17 … 2026-04-11 | 2026-09-26 08:30:56 … 08:31:03 |
| `payments.created` | 2024-02-17 … 2026-04-11 | 2026-09-26 08:31:03 … 08:31:12 |
| `invoices.dated` | … max 2026-04-11 | … max 2026-04-11 (preserved) |

So `dated` (the business date) survived, but `created` did not.

## Why it matters

- **Date-filtered reports return the wrong rows.** On the depot the guest's default month
  (September 2026) matches *all* rows; any real business period (e.g. 2024) returns **0**. So
  period filtering, which is the point of most reports and every ledger, is unusable on migrated
  data.
- **It blocks report verification and performance comparison.** The guest and legacy cannot be
  filtered to the same row set, so like-for-like totals or timings are impossible
  ([[guest-vs-legacy-report-performance]]).
- **Any look-back or audit query is wrong** — everything looks like it happened on the import day.

The same class of loss as [[import-from-v1-drops-invoice-maker]]: a column that carries real
information was not preserved by the load. Whether the cause is the importer not sending
`created`/`updated`, or the load defaulting them, needs to be pinned down in
[[pos-0029-rebuild-v1-import-on-guest]].

## Consequences / options

1. Fix the import to carry the source `created`/`updated` through (preferred; the ids differ, so
   this is a value copy, not a key match). Rebuild the depot and re-run the comparisons.
2. Derive report dates from `dated` instead of `created` — but that changes report semantics and
   `dated` is empty on some rows (`dated` min is `''`), so it is not a clean substitute.
3. Accept it and never rely on `created` on migrated data — not viable for reports.

## Evidence

- `backend/p_data/data.db` vs `trailbase/traildepot/data/main.db`, `min`/`max(created)` on
  `invoices`, `transactions`, `payments` (table above), 2026-09-27.
- `trailbase/src/runtime/app/compute/views.js` — the report views derive their date from the invoice/
  transaction `created`.
- `trailbase/src/runtime/app/lib/report-pages.js` — report `defaults` are month/day ranges over that date.

## Related

- [[reports-and-ledgers]] — the report date semantics.
- [[pos-0027-migrate-production-data-to-trailbase]] / [[pos-0029-rebuild-v1-import-on-guest]] —
  the migration that must preserve `created`.
- [[guest-vs-legacy-report-performance]] — the comparison this blocked.
