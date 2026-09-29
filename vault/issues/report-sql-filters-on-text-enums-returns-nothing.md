---
title: The preserved report SQL still filters on PocketBase TEXT enums, so it returns nothing against the integer-coded schema
type: issue
status: open
severity: high
created: 2026-09-29
updated: 2026-09-29
tags: [sql, views, enums, reports, parity, materialised, blocker]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-encode-enums-as-integer-codes]]", "[[legacy-sql-views-differ-from-js-views]]", "[[convert-base-views-not-derivations]]", "[[component-split-and-sql-materialised-tables]]", "[[tb-0022-move-reports-to-sql]]", "[[data-model]]"]
---

# The preserved report SQL still filters on PocketBase TEXT enums, so it returns nothing against the integer-coded schema

## Finding

The 15 preserved view files under `trailbase/runtime/app/reports/sql/views/` are the legacy
PocketBase SQL, carried over **untranslated**. They compare enum columns against **TEXT literals**,
but [[trailbase-encode-enums-as-integer-codes]] made those columns `INTEGER` foreign keys into
vocabulary tables. Every such comparison is now false against real data, and the view returns **zero
rows** while looking perfectly well-formed.

Verified directly on the live depot (2026-09-29), `traildepot/data/main.db`:

```text
payment_types vocabulary:   0='sending'  1='recieving'  2='return'

distinct payments.type stored:   type=0  559 rows
                                type=1  25,913 rows
                                type=2  54 rows

outstanding_summary.sql:28   WHERE pv.type IN ('recieving', 'return')   -- TEXT

  rows matching that TEXT filter   : 0
  rows matching integer codes 1,2  : 25,967
```

`outstanding_summary` therefore materialises to **0 rows** against a database holding 25,967
relevant payments. A from-scratch rebuild of the chain (measured, 60,245 records) built that view in
21 ms and produced nothing — fast and silently wrong, which is the worst combination available.

The same class of comparison appears throughout: `payments_invoices_report.sql:17-19` maps
`type` through `CASE WHEN type = 'sending' THEN 'purchase' …`, and `ledger_journal.sql` /
`transactions_report.sql` branch on the invoice type the same way.

## Why it was not caught

`USE_SQL_VIEWS` is **off** in shipped code — disabled in commit `5ccebd8` for the fresh-invoice
divergence ([[legacy-sql-views-differ-from-js-views]]) — so the `.sql` files are loaded but never
the source of truth. The JS `app/compute/` path translates codes to names before comparing, which is
why the guest reports are numerically right and these files are not. The drift was therefore
invisible for as long as the SQL path stayed disabled.

**This is the blocker for the materialised-table design.** Tier 2 cannot be built by transcribing
these files: a trigger-maintained money table that materialises 0 rows is worse than a slow one,
because it is wrong silently and is never rebuilt from scratch to notice.

## What has to happen first

1. Translate every enum comparison in the 15 files from TEXT to the integer codes — `payment_types`
   `0/1/2`, `invoice_types` `0/1/2/3`, `party_types` `0/1` — and decide what the `CASE` mapping
   should emit now that a code has no name attached ([[trailbase-encode-enums-as-integer-codes]]).
2. Enable `USE_SQL_VIEWS` and get the view-equivalence harness green
   (`trailbase/tools/view-equivalence.mjs`), which is the only existing check that compares the SQL
   path against the JS path.
3. Only then materialise.

## Evidence

- `trailbase/runtime/app/reports/sql/views/outstanding_summary.sql:28` — the TEXT filter.
- `python` against `traildepot/data/main.db` — 0 rows on the TEXT filter, 25,967 on codes `1,2`.
- From-scratch `CREATE TABLE AS` rebuild of the 15-file chain, 2026-09-29: 2,705 ms total;
  `outstanding_summary` → 0 rows, `payments_view` → 26,526 rows.
- [[tb-0022-move-reports-to-sql]] — the task this blocks.

## Related

- [[component-split-and-sql-materialised-tables]] — the design this blocks.
- [[convert-base-views-not-derivations]] — which arithmetic was to become SQL, and which stays JS.
