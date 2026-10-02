---
title: The preserved report SQL still filters on PocketBase TEXT enums, so it returns nothing against the integer-coded schema
type: issue
status: fixed
severity: high
created: 2026-09-29
updated: 2026-09-29
tags: [sql, views, enums, reports, parity, materialised, blocker, defect]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-encode-enums-as-integer-codes]]", "[[legacy-sql-views-differ-from-js-views]]", "[[convert-base-views-not-derivations]]", "[[component-split-and-sql-materialised-tables]]", "[[tb-0022-move-reports-to-sql]]", "[[data-model]]", "[[report-enum-translation-2026-09-29]]"]
---

# The preserved report SQL still filters on PocketBase TEXT enums, so it returns nothing against the integer-coded schema

**Status: fixed 2026-09-29.** The enum translation is applied and verified, and it exposed two
further structural defects in the same views, both also fixed. See
[[report-enum-translation-2026-09-29]] for the full pass. The findings are kept here because the
original defect is what made them findable.

## Finding

The 15 preserved view files under `trailbase/runtime/app/reports/sql/views/` (**deleted 2026-10-02**
with the legacy view layer) are the legacy
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

`outstanding_summary` therefore materialised to **0 rows** against a database holding 25,967
relevant payments. A from-scratch rebuild of the chain (measured, 60,245 records) built that view in
21 ms and produced nothing — fast and silently wrong, which is the worst combination available.

The same class of comparison appeared throughout: `payments_invoices_report.sql:17-19` maps `type`
through `CASE WHEN type = 'sending' THEN 'purchase' …`, and `ledger_journal.sql` /
`items_report.sql` branch the same way. **53 sites across 10 files.**

## Why it was not caught

`USE_SQL_VIEWS` is **off** in shipped code (the flag was deleted 2026-10-02 with the legacy view
layer, and is not coming back) — disabled in commit `5ccebd8` for the fresh-invoice
divergence ([[legacy-sql-views-differ-from-js-views]]) — so the `.sql` files are loaded but never
the source of truth. The JS `app/compute/` path translates codes to names before comparing, which is
why the guest reports are numerically right and these files are not. The drift was therefore
invisible for as long as the SQL path stayed disabled.

## Fix

`node trailbase/tools/translate-enums.mjs --write` (deleted 2026-10-02 with the legacy view
layer) — asserts every site matches its expected count
*and* that each replacement actually changes the text, then re-scans for leftover literals.
`python trailbase/tools/verify-translated-views.py` (deleted 2026-10-02 with the legacy view layer)
rebuilds all 15 and compares against the legacy
views in PocketBase, where the same SQL runs unmodified.

Two consequences of the schema change beyond the enums themselves:

- **`!= ''` became `IS NOT NULL`.** Ids are `uuid_v7` BLOBs, so an absent link is `NULL`, not `''`.
  `buildOutstanding()` tests `!p.invoice` / `!p.party`, which is `IS NOT NULL`.
- **`'cash'` became the sentinel `-1`** in `ledger_journal.sql`'s expenses branch, so the UNION
  column stays single-typed and cannot collide with codes 0/1/2.

## The translation is asymmetric

Comparison side becomes an integer; **output labels stay text**:

```sql
WHEN payments_view.type = 0 THEN 'purchase'   -- label, unchanged
```

because `buildPaymentsInvoicesReport()` emits `typeMap[p.type] ?? p.type` — the label — for that
report. A blind find-and-replace would have corrupted the output. The translation tool encodes this
per column rather than per literal for exactly that reason.

## Two further defects the pass exposed

Both were in the same files and both were silent. See [[report-enum-translation-2026-09-29]].

- `payments_invoices_report.sql` had an outer `GROUP BY split_inv.company, payments_view.invoice,
  payments_view.created` that the JS does not have. It collapsed distinct payment records sharing an
  invoice and timestamp — **5,980 of 33,556 rows** lost. Every company-split money figure was
  understated.
- `outstanding_summary.sql` joined a subquery keyed on (party, invoice) back to `payments_view` on
  **party alone**, fanning each payment row out by that party's outstanding-invoice count. The
  report totalled **28,656,988.99 against a true 3,698,209.31**, and one party appeared to hold
  30.7M of the world's 29.7M of receivables. `GROUP_CONCAT(DISTINCT ...)` on `invoice_nos` masked
  it, because DISTINCT collapsed the duplicated invoice numbers while leaving the sums multiplied.

## Evidence

- `trailbase/runtime/app/reports/sql/views/outstanding_summary.sql:28` — the TEXT filter, since
  fixed. File deleted 2026-10-02 with the legacy view layer.
- `python` against `traildepot/data/main.db` — 0 rows on the TEXT filter, 25,967 on codes `1,2`.
- `trailbase/tools/translate-enums.mjs` — 53 sites, 10 files, no leftovers (deleted 2026-10-02 with
  the legacy view layer).
- `trailbase/tools/verify-translated-views.py` — 13 of 15 views now match PocketBase row for row
  (deleted 2026-10-02 with the legacy view layer; see [[legacy-parity-checks-waived]]).
- [[tb-0022-move-reports-to-sql]] — the task this blocked, now unblocked.
