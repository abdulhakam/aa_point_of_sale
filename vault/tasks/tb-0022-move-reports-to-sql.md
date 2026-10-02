---
title: TB-0022 Move report arithmetic into SQL (runtime .sql files)
type: task
status: done
priority: high
created: 2026-09-27
updated: 2026-10-01
tags: [reports, sql, no-build, performance]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-enum-translation-2026-09-29]]", "[[report-sql-filters-on-text-enums-returns-nothing]]", "[[legacy-sql-views-differ-from-js-views]]", "[[report-logic-stays-runtime-file-based]]", "[[guest-report-performance-options]]", "[[legacy-report-sql-uses-company-columns]]", "[[dispatcher-transpiled-per-request]]", "[[component-split-and-sql-materialised-tables]]", "[[manifest-driven-routing-and-data-dag]]", "[[spooling-report-rows-through-kv]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[six-report-defects-the-empty-filter-parity-gate-could-not-see]]", "[[spool-blob-bind-decoder-rejected-unpadded-base64]]"]
---

# TB-0022 Move report arithmetic into SQL (runtime .sql files)

Implement the SQL path for reports so the scanning/aggregation runs in SQLite (C) instead of the
QuickJS interpreter, **without** losing the no-build authoring property
([[report-logic-stays-runtime-file-based]]). Owner decisions (2026-09-27): port the legacy SQL
**verbatim**; keep it as **runtime `.sql` files under `app/`**; convert **along the dependency
graph**, fanning out independent views as jobs; **JS stays the default** until each report is
switched.

## Done

> **2026-10-02:** the 15 `sql/views/` files, `app/lib/sqlviews.js`, `USE_SQL_VIEWS` and the six tools
> named in this list were deleted with the legacy view layer — see [[legacy-parity-checks-waived]].
> The items below are the 2026-09 record of what was built; the tools can no longer be re-run.

- [x] Host: cache the transpiled route source by content hash ([[dispatcher-transpiled-per-request]])
- [x] `trailbase/tools/extract-legacy-views.mjs` — extracts all view SQL **verbatim** from
      `backend/p_data/data.db` (the migrations only carry some) and normalises PocketBase's
      double-quoted string literals (`"%.2f"`) to single quotes, which TrailBase's SQLite requires.
      **15 views** written to `trailbase/runtime/app/reports/sql/views/`
- [x] `trailbase/tools/verify-legacy-views.mjs` — composes each view with its dependencies inlined
      as CTEs and runs it against the depot; **15/15 pass**, row counts matching PocketBase where
      comparable (`net_price` 23,414 = 23,414; `transaction_view` 23,413 = 23,413)
      **CORRECTED 2026-09-29 — this check verified nothing.** It counted `ok++` for any view that
      *ran*, and printed the PocketBase count without comparing it, so a view returning 0 rows
      passed. "15/15 pass" meant "none threw". The tool now compares counts and exits non-zero on a
      mismatch. It also defaulted `DEPOT_DB` to a stale scratch copy in `%TEMP%`, which made
      `outstanding_summary` report 609 parties instead of 602. See
      [[report-enum-translation-2026-09-29]].
- [x] Composer: wrap the target in a subquery so a view that starts with its own `WITH` works
- [x] Adapt the one real schema divergence: `payments_view.order_bookers.company` →
      a deterministic subquery over `order_booker_companies`
      ([[legacy-report-sql-uses-company-columns]])
- [x] Literal normalisation now consults the real schema (a token is only an identifier if it is a
      table/view/column name), which fixed `"sending"` and friends
- [x] Equivalence gate: `trailbase/tools/view-equivalence.mjs` compares SQL rows with
      `compute/views.js` rows on the same data. **0/13 identical** — the legacy SQL is *not*
      equivalent to the JS: `printf` numbers vs numbers, extra/missing columns, and genuine math
      differences (`ledger_*` credit/debit, `items_report` qty, `outstanding` 602 vs 0,
      `payments_invoices_report` 33,129 vs 29,984). The parity reference is the **JS**
      ([[legacy-sql-views-differ-from-js-views]]).
- [x] **2026-09-29 — enum translation, 53 sites across 10 files**
      (`trailbase/tools/translate-enums.mjs`), the blocker in
      [[report-sql-filters-on-text-enums-returns-nothing]]: the preserved SQL compared enum columns
      against **text** while the schema stores **integers**, so every such comparison was false and
      the affected views returned 0 rows. The translation is **asymmetric** — comparison side
      becomes an integer, output labels stay text, because
      `buildPaymentsInvoicesReport()` emits the label. Two non-enum consequences of the same schema
      move were fixed at the same time: `!= ''` → `IS NOT NULL` (ids are uuid BLOBs, so an absent
      link is NULL) and `'cash'` → the sentinel `-1` in `ledger_journal.sql`.
- [x] **2026-09-29 — two structural defects the pass exposed, both silent, both understating money**
      ([[report-enum-translation-2026-09-29]]):
      - `payments_invoices_report.sql` had an outer `GROUP BY` the JS does not have, collapsing
        distinct payment records that share an invoice and timestamp. **5,980 of 33,556 rows lost**
        (27,576 instead of 33,556).
      - `outstanding_summary.sql` joined a subquery keyed on (party, invoice) back to
        `payments_view` on **party alone**, fanning out by the party's outstanding-invoice count.
        The report totalled **28,656,988.99 against a true 3,698,209.31**, and one party appeared to
        hold 30.7M of the world's 29.7M of receivables. `GROUP_CONCAT(DISTINCT ...)` on
        `invoice_nos` masked it. **Outstanding is the first cash-memo number on screen.**
- [x] **2026-09-29 — verification** (`verify-translated-views.py`,
      `verify-guest-only-views.py`): all 13 comparable views now match PocketBase row for row.
      `outstanding_summary` matches the JS on **602/602 parties**, 601 balances identical and 1
      differing by 0.01 from float accumulation order. `payments_view` matches to the cent
      (108,057,580.14).
- [x] **2026-09-30 — DONE. All 14 reports ported, 14/14 verified, 14/14 byte-identical in the guest.**
      The plan above (reuse the preserved `sql/views/` SQL, then enable `USE_SQL_VIEWS`) was
      **superseded** — those files are known to differ from the JS, so every statement was ported
      from `compute/` directly and gated against it. Rows now reach the renderer by KV handle and
      never enter QuickJS.
      - `node trailbase/tools/verify-spool-reports.mjs` → **14/14 equivalent** to `compute/reports.js`
      - `pwsh -File trailbase/tools/run-spool-sweep.ps1` → **14/14 byte-identical HTML**, 13.1 % faster
        overall (55,391 → 48,145 ms summed medians)
      - `node trailbase/tools/guest-smoke.mjs` → **76/76**
      - See [[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]] and
        [[spooling-report-rows-through-kv]].
- [x] **2026-10-01 — DONE. The spool is the LIVE path for all 14 reports, on both surfaces.**
      `/reports/<slug>` and `/p/<slug>/data` no longer call `A.service.run`. Each runs two
      statements: the rows (capped by a `LIMIT`, not sliced in JS) and a **totals statement that wraps
      the report statement** and reduces it to one row of formatted strings — see
      [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]. `useJs: true` on a report
      page, or `compute.useJs: true` on a declarative page, re-enables `compute/reports.js` for that
      page alone. `render.json` was added so the page payload's `result.rows` is spliced and serialised
      in Rust.
      - `node trailbase/tools/verify-spool-reports.mjs` → **14/14**, plus **72 binds** proved to reach
        their statement and to narrow it, plus page-column and totals-key checks
      - `node trailbase/tools/check-report-pages.mjs` → every report page and every page payload
        rendering, **with the two surfaces agreeing** on row count and totals for identical filters
      - `node trailbase/tools/verify-prelude.mjs` → 15/15; `check-money-text.mjs` → 438,407 values at 2dp
      - Seven defects found and fixed on the way, **all invisible to the old empty-filter gate** and all
        producing correct row counts and correct money: see
        [[six-report-defects-the-empty-filter-parity-gate-could-not-see]] and
        [[spool-blob-bind-decoder-rejected-unpadded-base64]] (the latter shipped in `f449670` and
        killed every id filter on a spooled report).
- [x] **2026-10-01 — DONE. Totals are counted in integer paisas by SQLite only.**
      The totals statement's `tiers` layer converts every amount to whole paisas, sums integers, and
      divides by 100 once on the way out, so a total is the exact sum of the rows behind it rather than
      a float sum whose value depends on addition order. Ties break half up — the accounting
      convention, and irrelevant on the 2 dp projections the money rule already guarantees, so it only
      decides the general ledger's raw account columns.
      **The acceptance standard changed with it, and that is the point.** The gate no longer asks
      whether a total matches `compute/reports.js`, which accumulates floats and rounds once at the end:
      that is an approximation of the same quantity, and reproducing its drift would be agreement
      rather than accuracy. It now proves the SQL is **exact** (integer paisa sum of its rows, reduced
      independently), **sound** (a derived total satisfies its own `{op, terms}` definition over the
      SQL's other totals) and **corroborated** (a second, independently written paisa construction
      agrees, which covers a `CASE` bucket that cannot be reduced from rows in JS).
      - **14/14 pass, 72 binds verified, 15 totals proven exact and 26 corroborated**
      - **9 totals differ from the retired JS reference by a paisa, and the SQL is right in all nine**
      - the `round2`-of-`round2` nesting the float form needed collapsed to one subtraction of integers
      See [[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]].

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

- `trailbase/runtime/app/lib/sqlviews.js` (deleted 2026-10-02): loads `app/reports/sql/views/*.sql`
  at runtime, inlines
  dependencies as CTEs, derives column names (comment-aware), runs via `sqlite.all`, and appends
  `ORDER BY "id" DESC` to match the JS input order.
- `trailbase/runtime/app/lib/reports.js`: a `SQL_VIEWS` map + `USE_SQL_VIEWS` (true at this
  point in history; **off again since `5ccebd8`** — see the correction below; both deleted 2026-10-02).
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

- [x] ~~Option 3: speed up the render, not the transport.~~ **Partly answered 2026-09-30.** The
      earlier finding was that shipping rows columnar and expanding them in Rust gave **no gain**
      (warm profit 4.00 → 4.32 s), so the JS↔Rust JSON was not the cost. That remains true *for a
      report that renders its rows*, and the spool result says the same thing from the other side:
      the 26.7 % it saved was on acquisition, and the shared `minijinja` cost dominated both arms.
      What is now established is that the transport **can** be removed entirely
      ([[report-rows-are-spooled-not-parsed]]); what is still open is the `minijinja` cost itself,
      which needs either fewer rendered rows (pagination/limits, or client-side rendering — a
      **product decision**) or a faster renderer.
- [ ] Remove the JSON serialising on the paths the spool now covers, once the ports are done. The
      handle exists and is proven; what remains is deleting `sqlite.all`'s round-trip for report
      reads, which cannot happen until no report depends on it. **`sqlite.all` must stay** for base
      table reads and for any view another view builds on.
- [x] ~~`sql+js` for `paymentsView`~~ — **tried and reverted**: SQL rows + a JS `company` array gave
      **9–12/14, flaky**. The legacy `payments_view` differs from the JS in more than `company`, as
      the equivalence gate warned. `paymentsView` stays JS; only gate-proven views convert.
- [ ] Extend the SQL mapping only where the equivalence gate proves a view byte-identical
      (`net_price`/`items_report` are not, on the evidence already collected)
- [ ] `tb-0015` integer cents remains the storage-level form of the 2 dp rule

## Related

- [[report-rows-are-spooled-not-parsed]] — **the decision this task now turns on.**
- [[spooling-report-rows-through-kv]] — the mechanism and how to verify it.
- [[report-logic-stays-runtime-file-based]] — the design.
- [[legacy-report-sql-uses-company-columns]] — the verbatim-port blocker found.
- [[guest-report-performance-options]] — why this is worth doing.
