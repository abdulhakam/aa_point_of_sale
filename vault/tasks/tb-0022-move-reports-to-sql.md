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
- [x] `trailbase/src/tools/extract-legacy-views.mjs` — extracts all view SQL **verbatim** from
      `backend/p_data/data.db` (the migrations only carry some) and normalises PocketBase's
      double-quoted string literals (`"%.2f"`) to single quotes, which TrailBase's SQLite requires.
      **15 views** written to `trailbase/src/runtime/app/reports/sql/views/`
- [x] `trailbase/src/tools/verify-legacy-views.mjs` — composes each view with its dependencies inlined
      as CTEs and runs it against the depot; **15/15 pass**, row counts matching PocketBase where
      comparable (`net_price` 23,414 = 23,414; `transaction_view` 23,413 = 23,413)
- [x] Composer: wrap the target in a subquery so a view that starts with its own `WITH` works
- [x] Adapt the one real schema divergence: `payments_view.order_bookers.company` →
      a deterministic subquery over `order_booker_companies`
      ([[legacy-report-sql-uses-company-columns]])
- [x] Literal normalisation now consults the real schema (a token is only an identifier if it is a
      table/view/column name), which fixed `"sending"` and friends
- [x] Equivalence gate: `trailbase/src/tools/view-equivalence.mjs` compares SQL rows with
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
| `paymentsView` ↔ `payments_view` | 26526/26526 | `company` is an **array** in JS, `null` in SQL — and more (hybrid attempt failed) |
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

- `trailbase/src/runtime/app/lib/sqlviews.js`: loads `app/reports/sql/views/*.sql` at runtime, inlines
  dependencies as CTEs, derives column names (comment-aware), runs via `sqlite.all`, and appends
  `ORDER BY "id" DESC` to match the JS input order.
- `trailbase/src/runtime/app/lib/reports.js`: a `SQL_VIEWS` map + `USE_SQL_VIEWS` (true at this
  point in history; **off again since `5ccebd8`** — see the correction below).
- Fixed a real **loader bug**: aliased named imports were inverted
  (`import { rows as x }` generated `{x: rows}`), which silently broke `sqlviews` until corrected.
- **Enabled after enforcing the 2 dp money rule** ([[money-is-2dp-everywhere]]): with money at 2 dp
  the float flake disappears. Verified **14/14 on three consecutive differential runs** with the SQL
  path on, plus smoke 71/71 and management-check.

**Correction (2026-09-28):** `USE_SQL_VIEWS` is **off** in the shipped code. `5ccebd8` (invoice
entry) reversed the enablement because the SQL base views diverge on fresh invoices with an empty
`dated` ([[legacy-sql-views-differ-from-js-views]]) — a correctness reversal, not a speed one. The
table below therefore measures the SQL path when it was on.

Measured with the SQL base views on ([[guest-vs-node-performance]] method):

| Endpoint | SQL off | SQL on |
|---|---|---|
| `/reports/profit` cold | 16.6 s | **13.9 s** |
| `/dashboard` cold | 2.3 s | **0.26 s** |
| `/p/reports/profit/data` warm | 2.7 s | **2.4 s** |
| `/reports/profit` warm | 3.9 s | 4.0 s (unchanged — the JS↔Rust payload) |

Cold report time improved ~16 % and dashboard cold ~9×; the **derived JS views and the large HTTP
payload still dominate**, which is what option 3 (render in Rust) targets.

## Next

- [ ] Option 3: speed up the *render*, not the transport. Measured: shipping rows columnar and
      expanding them in Rust gave **no gain** (warm profit 4.00 → 4.32 s), so the cost is
      `minijinja` rendering ~21.8k rows (and the `/p` payload itself), not the JS↔Rust JSON. The
      lever is rendering **fewer rows** (pagination/limits, or client-side rendering of large
      reports) — a **product decision**, left open.
- [x] ~~`sql+js` for `paymentsView`~~ — **tried and reverted**: SQL rows + a JS `company` array gave
      **9–12/14, flaky**. The legacy `payments_view` differs from the JS in more than `company`, as
      the equivalence gate warned. `paymentsView` stays JS; only gate-proven views convert.
- [ ] Extend the SQL mapping only where the equivalence gate proves a view byte-identical
      (`net_price`/`items_report` are not, on the evidence already collected)
- [ ] `tb-0015` integer cents remains the storage-level form of the 2 dp rule

## Related

- [[report-logic-stays-runtime-file-based]] — the design.
- [[legacy-report-sql-uses-company-columns]] — the verbatim-port blocker found.
- [[guest-report-performance-options]] — why this is worth doing.
