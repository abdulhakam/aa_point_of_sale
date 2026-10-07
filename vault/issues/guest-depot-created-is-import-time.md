---
title: The production-data depot has created overwritten with the import timestamp
type: issue
status: verified
severity: medium
created: 2026-09-27
tags: [migration, import, data-integrity, reports, dates, depot]
related_to: ["[[data-model]]", "[[reports-and-ledgers]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[guest-vs-legacy-report-performance]]"]
---


## RESOLVED FOR THE DIRECT PATH 2026-10-06

The defect is a property of the **record-API import path**, not of the trailbase schema. The direct
importer ([[v1-direct-import-tool]], `trailbase/tools/import-v1-tui.mjs`) writes `main.db` itself and
copies the source row's `created` and `updated` verbatim: a full import on a depot copy produced
**0 created/updated mismatches** across all eleven collections, and a live end-to-end reset+import on
2026-10-07 reproduced it (min..max `created`/`updated` identical to source for invoices, transactions,
payments and items; reports return rows) ([[tb-0035-direct-sqlite-v1-importer]]).

So option 1 below ("fix the import to carry the source `created`/`updated` through") is **done for
the file-to-file path**. The browser plugin / `import-from-v1.mjs` path still stamps the import time,
because that is what the record API does; the note remains accurate for it. The residual `Invoice
Time` on the printed guest sheet ([[guest-invoice-print-dropped-the-party-and-booker-names]]) is
resolved the same way when the depot is loaded by the direct tool.

## RE-MEASURED 2026-10-01: true, but the impact is narrower than "high" suggests

The data confirms it, and it is worth being precise about what it does and does not affect.

```text
invoices.created  min=2026-09-29 07:07  max=2026-09-29 14:50  distinct=369 of 8,935
invoices.updated  min=2026-09-29 19:40  max=2026-09-29 19:42  distinct=2
invoices.dated    distinct=8,909                                  (the BUSINESS date, and it varies)
```

**Reports are not affected.** They filter on `dated`, the invoice's own business date, which has
8,909 distinct values. `created` is carried through the views but no report filters or orders by it.

**Where it does bite:** `invoiceView.dated` falls back to `created` (`inv.dated || inv.created`), so
the invoices with an empty `dated` - about 26 of 8,935 - are dated at the import moment. That is the
real exposure, and it is small.

**A sharper consequence, found while checking.** The incremental-rebuild fingerprint probes
`COUNT(*)` and `MAX("updated")` per table (`app/lib/reports.js:176`), and `invoices.updated` has only
**two** distinct values. A create and a delete that cancel out in count, between two probes, with
neither touching `updated`, would leave the fingerprint unchanged and the views stale. That is a
narrow race, but it is a real one and it belongs with this note rather than in a new one.

Severity is **medium**, not high: the business dates are sound, and the exposure is the fallback plus
the fingerprint race.

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
- `trailbase/runtime/app/compute/views.js` — the report views derive their date from the invoice/
  transaction `created`.
- `trailbase/runtime/app/lib/report-pages.js` — report `defaults` are month/day ranges over that date.

## Related

- [[reports-and-ledgers]] — the report date semantics.
- [[pos-0027-migrate-production-data-to-trailbase]] / [[pos-0029-rebuild-v1-import-on-guest]] —
  the migration that must preserve `created`.
- [[guest-vs-legacy-report-performance]] — the comparison this blocked.
