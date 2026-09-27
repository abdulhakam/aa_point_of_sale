---
title: TB-0022 Move report arithmetic into SQL (runtime .sql files)
type: task
status: doing
priority: high
created: 2026-09-27
updated: 2026-09-27
tags: [reports, sql, no-build, performance]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-logic-stays-runtime-file-based]]", "[[guest-report-performance-options]]", "[[legacy-report-sql-uses-company-columns]]", "[[dispatcher-transpiled-per-request]]"]
---

# TB-0022 Move report arithmetic into SQL (runtime .sql files)

Implement the SQL path for reports so the scanning/aggregation runs in SQLite (C) instead of the
QuickJS interpreter, **without** losing the no-build authoring property
([[report-logic-stays-runtime-file-based]]). Owner decisions (2026-09-27): port the legacy SQL
**verbatim**; keep it as **runtime `.sql` files under `app/`**; convert **along the dependency
graph**, fanning out independent views as jobs; **JS stays the default** until each report is
switched.

## Done

- [x] Host: cache the transpiled route source by content hash ([[dispatcher-transpiled-per-request]])
- [x] `runtime-js/tools/extract-legacy-views.mjs` — extracts all view SQL **verbatim** from
      `backend/p_data/data.db` (the migrations only carry some) and normalises PocketBase's
      double-quoted string literals (`"%.2f"`) to single quotes, which TrailBase's SQLite requires.
      **15 views** written to `runtime-js/site/app/reports/sql/views/`
- [x] `runtime-js/tools/verify-legacy-views.mjs` — composes each view with its dependencies inlined
      as CTEs and runs it against the depot; **15/15 pass**, row counts matching PocketBase where
      comparable (`net_price` 23,414 = 23,414; `transaction_view` 23,413 = 23,413)
- [x] Composer: wrap the target in a subquery so a view that starts with its own `WITH` works
- [x] Adapt the one real schema divergence: `payments_view.order_bookers.company` →
      a deterministic subquery over `order_booker_companies`
      ([[legacy-report-sql-uses-company-columns]])
- [x] Literal normalisation now consults the real schema (a token is only an identifier if it is a
      table/view/column name), which fixed `"sending"` and friends
- [x] Equivalence gate: `runtime-js/tools/view-equivalence.mjs` compares SQL rows with
      `compute/views.js` rows on the same data. **0/13 identical** — the legacy SQL is *not*
      equivalent to the JS: `printf` numbers vs numbers, extra/missing columns, and genuine math
      differences (`ledger_*` credit/debit, `items_report` qty, `outstanding` 602 vs 0,
      `payments_invoices_report` 33,129 vs 29,984). The parity reference is the **JS**
      ([[legacy-sql-views-differ-from-js-views]]).

## Reconciliation status (2026-09-27)

Fixes applied in the extractor: `printf('%.2f', expr)` → a **JS-faithful** rounding expression
(`Math.round((x + EPSILON) * 100) / 100`, `COALESCE` for `num()`), aliases the JS keeps raw
(`unrounded_total`) left unrounded, and `%.Nf` handled generally. The gate's comparator ignores
float-representation noise (`toFixed(6)` on numbers — far coarser than the noise, far finer than a
cent), so it cannot hide a cent.

**2 views now byte-identical**, and every remaining difference is a specific, listed item:

| View pair | Rows js/sql | Remaining difference |
|---|---|---|
| `transactionView` ↔ `transaction_view` | 23413/23413 | **identical** |
| `invoiceView` ↔ `invoice_view` | 8927/8927 | **identical** |
| `transactionsReport` ↔ `transactions_report` | 23413/23413 | **2 rows**, a 1-cent float-accumulation artifact |
| `itemsDifferenceReport` ↔ `items_difference_report` | 207/207 | 42 rows: `qty` units (js=4 sql=0) |
| `paymentsView` ↔ `payments_view` | 26526/26526 | `company` is an **array** in JS, `null` in SQL → `sql+js` |
| `itemsReport` ↔ `items_report` | 207/207 | `qty` units: js=756 vs sql=3276 |
| `ledgerJournal` ↔ `ledger_journal` | 26614/26614 | `accounts_recievable`/`cash` signs |
| `ledgerBooker`/`ledgerParty` | 26526/26526 | JS adds `booker`; `credit` differs |
| `ledgerArea` ↔ `ledger_area` | 924/924 | SQL has 6 extra columns |
| `outstanding` ↔ `outstanding_summary` | 602/**0** | SQL returns no rows |
| `paymentsInvoicesReport` ↔ `payments_invoices_report` | 33129/**29984** | row set differs |

**Strategy decided from these results** ([[convert-base-views-not-derivations]]): convert the
**base** views to SQL (the expensive scans/joins, where parity is proven) and keep the
**report-level derivations** in JS (the policy — allocation, credit/debit, threshold, splitting),
with `sql+js` for columns SQL cannot express (the `company` array).

## Runtime plumbing (2026-09-27)

- `runtime-js/site/app/lib/sqlviews.js`: loads `app/reports/sql/views/*.sql` at runtime, inlines
  dependencies as CTEs, derives column names (comment-aware), runs via `sqlite.all`, and appends
  `ORDER BY "id" DESC` to match the JS input order.
- `runtime-js/site/app/lib/reports.js`: a `SQL_VIEWS` map + `USE_SQL_VIEWS` switch. **Off by
  default** — with it on the differential fell to **12/14 and was flaky**, because SQLite does not
  guarantee the scan order feeding an aggregate, so `SUM` accumulates doubles differently from the
  JS's fixed-order `+=` ([[report-parity-flakes-on-float-arithmetic]]).
- Fixed a real **loader bug**: aliased named imports were inverted
  (`import { rows as x }` generated `{x: rows}`), which silently broke `sqlviews` until corrected.

## Next

- [ ] Make the float-sensitive accumulation deterministic (integer cents — [[tb-0015-integer-cents-for-money]] — or keep those aggregates in JS), then enable `USE_SQL_VIEWS` and re-run the 14/14 differential
- [ ] Make the differential compare money with a tiny tolerance (it already flaked 13/14 → 14/14 on unchanged code)
- [ ] `sql+js` for `paymentsView` (SQL rows + JS `company` array) once the switch is viable
- [ ] Then option 3 from [[guest-report-performance-options]]: render reports in Rust from SQL

## Related

- [[report-logic-stays-runtime-file-based]] — the design.
- [[legacy-report-sql-uses-company-columns]] — the verbatim-port blocker found.
- [[guest-report-performance-options]] — why this is worth doing.
