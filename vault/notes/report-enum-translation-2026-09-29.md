---
title: Report enum translation and the two structural defects it exposed
type: note
status: active
created: 2026-09-29
system: new
tags: [sql, views, enums, reports, parity, defect, translation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-sql-filters-on-text-enums-returns-nothing]]", "[[legacy-sql-views-differ-from-js-views]]", "[[tb-0022-move-reports-to-sql]]", "[[trailbase-encode-enums-as-integer-codes]]", "[[trailbase-drop-sql-views]]", "[[component-split-and-sql-materialised-tables]]"]
---

# Report enum translation and the two structural defects it exposed

The 15 preserved views under `trailbase/runtime/app/reports/sql/views/` were the legacy PocketBase
SQL carried over untranslated, so they compared enum columns against **text** while the schema stores
**integers**. That is [[report-sql-filters-on-text-enums-returns-nothing]]. This note records the fix
and the two larger defects it uncovered, because both were silent and both understated money.

## The pass

`node trailbase/tools/translate-enums.mjs --write` — **53 sites across 10 files**, 0 leftovers.

The translation is **asymmetric**, and that is the whole subtlety:

| side | before | after |
|---|---|---|
| comparison | `payments.type = 'sending'` | `payments.type = 0` |
| output label | `THEN 'purchase'` | `THEN 'purchase'` — **unchanged** |

`buildPaymentsInvoicesReport()` emits `typeMap[p.type] ?? p.type`, i.e. the *label*, for that
report, while comparing codes everywhere else. A blind find-and-replace would have corrupted the
output column. The tool therefore resolves the vocabulary **per column**, not per literal.

Two changes were not enums but consequences of the same schema move:

- **`!= ''` → `IS NOT NULL`** (`outstanding_summary.sql`). Ids are `uuid_v7` BLOBs, so an absent
  link is `NULL`. `buildOutstanding()` tests `!p.invoice` / `!p.party`.
- **`'cash'` → `-1`** (`ledger_journal.sql` expenses branch), so the UNION column stays
  single-typed and cannot collide with codes 0/1/2.

### A tooling bug worth recording

The first version of the tool asserted only that each *pattern* matched the expected count. It
extracted the column from the regex **source**, which contains escaped dots (`p1\.type`), so the
extraction silently failed and the vocabulary lookup fell through to a default. Result:
`IN ('recieving','return')` became `IN (1,'return')` — a **half-translated file** that still passed
the count assertion. The tool now asserts twice per site: the pattern must match the expected
count, *and* each replacement must change the text. A leftover scan then re-reads the written files
and fails if any enum literal survives outside a `THEN` clause.

## Defect 1 — a GROUP BY that merged distinct payments

`payments_invoices_report.sql` ended with:

```sql
GROUP BY split_inv.company, payments_view.invoice, payments_view.created
```

The JS emits **one row per (payment, company part)** with no grouping. The join already produces the
right multiplicity. The group collapsed distinct payment records that shared an invoice and a
`created` timestamp — **3,293 (invoice, created) pairs covering 7,365 payments** — and dropped
**5,980 of 33,556 rows**.

Proven not to be caused by the enum work: building the view before and after the translation gives
**27,576 rows either way**. The A/B also showed what the translation *did* fix — the `type` label
went from **27,576 NULLs to 0**, matching the JS exactly.

## Defect 2 — a join fan-out that inflated Outstanding 7.7×

`outstanding_summary.sql` left-joined a subquery keyed on **(party, invoice)** back to
`payments_view` on **party alone**:

```sql
LEFT JOIN (SELECT pv2.party, pv2.invoice, pv2.invoiceNo ... GROUP BY pv2.party, pv2.invoice ...)
       ON inv_outstanding.party = pv.party
```

A party with 20 outstanding invoices therefore had all 20 rows joined onto **every one of its
payment rows**. `invoice_total`, `paid_total` and `balance` were all multiplied.

| | before fix | after fix | truth |
|---|---|---|---|
| total balance | 28,656,988.99 | **3,698,209.32** | 3,698,209.31 |
| worst single party | 30,777,670.20 | — | world total is 29,745,282.82 |

`GROUP_CONCAT(DISTINCT ...)` on `invoice_nos` **hid it**: DISTINCT collapsed the duplicated invoice
numbers while leaving the sums multiplied, so the invoice list looked plausible. One party appeared
to hold more receivables than the entire company. `buildOutstanding()` has no such join — it keeps a
`Map<party, Set<invoiceNo>>` and looks it up.

The fix pre-aggregates the subquery to **at most one row per party** before joining, so the join is
1:1 on party.

This is the most consequential of the three defects: **Outstanding is the first cash-memo number on
screen**, and it was 7.7× too high.

## Verification

`python trailbase/tools/verify-translated-views.py` rebuilds all 15 views on a copy of the depot,
composing dependencies as CTEs the way `app/lib/sqlviews.js` does, and compares against the **same
views unmodified in PocketBase** — where the enum columns really are text. Same data, same
arithmetic, two encodings.

| view | guest | legacy | |
|---|---|---|---|
| transaction_view | 23,413 | 23,413 | agree |
| invoice_view | 8,927 | 8,927 | agree |
| items_report / items_difference_report | 207 / 207 | 207 / 207 | agree |
| transactions_report | 23,413 | 23,413 | agree |
| net_price | 23,414 | 23,414 | agree |
| payments_view | 26,526 | 26,526 | agree |
| **payments_invoices_report** | **33,556** | **33,556** | agree (was 27,576) |
| ledger_area | 924 | 924 | agree |
| ledger_booker / ledger_party | 26,526 / 26,526 | 26,526 / 26,526 | agree |
| ledger_journal | 26,614 | 26,614 | agree |
| counts_for_row_numbers | 1 | 1 | agree |

`payments_summary` (2,675) and `outstanding_summary` (602) are **guest-only** — no legacy view — so
`verify-guest-only-views.py` compares them against the JS builders, which are the guest's current
source of truth:

- `outstanding_summary`: **602 parties on both sides, 601 balances identical, 1 differing by
  0.01** from float accumulation order. `payments_view` beneath it matches the JS to the cent
  (108,057,580.14 both, and every type × paid breakdown agrees).
- `payments_summary`: 2,675 rows; no JS counterpart is in the persisted snapshot to diff against yet.

### A caveat on the harness

The guest's JS views emit ids as **URL-safe** base64 (note the `-` characters). Standard
`base64.b64decode(..., validate=True)` rejects those and silently loses **208 of the 602** parties,
which presents as a data divergence that is not there. The verifier normalises with
`urlsafe_b64decode`.

### Two harnesses that were lying, and one stale default

**`verify-legacy-views.mjs` reported "15/15 pass" while the views returned nothing.** It counted
`ok++` for any view that *composed and ran*, and printed the PocketBase row count without ever
comparing it. A view that compiles and returns zero rows passes that check perfectly — which is
exactly the shape the enum defect took. The tool now compares the counts and exits non-zero on a
mismatch, so the "15/15 pass" line recorded in [[tb-0022-move-reports-to-sql]] meant only "none of
them threw". The tb-0022 note has been corrected.

**`verify-legacy-views.mjs` defaults `DEPOT_DB` to a scratch copy** under
`%TEMP%\kilo\aa-perf-depot\data\main.db`, not the real depot. That copy is stale, and it made
`outstanding_summary` report 609 parties where the real depot gives 602. Every run must set
`DEPOT_DB` explicitly or the numbers are about the wrong database. This is the likely origin of the
stale "no production data is currently loaded" claims elsewhere in the vault.

### What the harnesses still do not prove

- Only **3 of 15** views are actually compared against PocketBase (`counts_for_row_numbers`,
  `net_price`, `transaction_view`); the other 12 report `pb=n/a` because the composed SQL has no
  standalone PocketBase counterpart. For those, the checks that have been run are the row counts
  recorded above and the per-party/aggregate diffs for `payments_view` and `outstanding_summary`.
- A full per-column diff of all 15 against the JS has **not** been done. That, not the enums, is
  what stands between here and enabling `USE_SQL_VIEWS`.

## Related

- [[report-sql-filters-on-text-enums-returns-nothing]] — the original defect.
- [[trailbase-drop-sql-views]] — the decision that was later reversed; read before changing this.
