---
title: SQL review — rounding, the dead view layer, and what the prelude actually costs
type: note
status: active
created: 2026-10-02
tags: [sql, sqlite, rounding, money, views, prelude, code-review, reports]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[money-is-2dp-everywhere]]", "[[report-total-disagrees-with-its-own-printed-column]]", "[[legacy-sql-views-differ-from-js-views]]", "[[convert-base-views-not-derivations]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]", "[[paymentsbycompany-performance-2026-10-02]]", "[[sql-rounding-differs-from-js-round2]]", "[[reports-and-ledgers]]", "[[manifest-first-architecture-gap-2026-10-02]]"]
---

# SQL review — rounding, the dead view layer, and what the prelude actually costs

A review of all 28 SQL files (`prelude.sql` 448 lines, 15 files in `views/`, 14 in `reports/`) against
one instruction: **stop rounding between steps, round once at the end**, and **no SQL views in
TrailBase — the `.sql` files are the source and get queried**. Parity with the previous outputs was
explicitly released as a constraint ("some of the previous calculations are already wrong and will be
corrected"), which is what makes the first instruction implementable at all.

Nothing has been changed. This is the analysis and the decision it needs.

## 1. Rounding: what deferring it actually costs

The prelude has **20 round sites**, all the same `round2` template. They are not equivalent, and
splitting them into two kinds is the whole answer:

| Kind | Sites | Verdict |
|---|---|---|
| **Output** — the value a person reads | the per-line `total` in `itemsales`/`profit`, `net_amount`, `final_amount`, `profit`, invoice `final_total`, every `printf('%.2f')`/`amountText` | **Keep.** A printed money column has to be 2 dp |
| **Intermediate** — only ever summed | `line_totals.total` before `invoice_s` sums it; `profit` before the profit total sums it | **Can be deferred**, and this is what the instruction asks for |

Measured on the production depot (8,504 invoices with lines, 23,413 lines):

| Question | Answer |
|---|---|
| Invoice totals that change if the sum is rounded once | **52 of 8,504 (0.61%)** |
| Net money movement across the whole ledger | **−47 paisa (Rs −0.47)** |
| Largest single invoice movement | **4 paisa** |
| Profit total: sum of rounded lines vs round of the sum | 3,574,677.89 → **3,574,678.66** (77 paisa) |
| Lines with any sub-paisa fraction at all | 2,502 of 23,413 (10.7%) — the other 89.3% are untouched by the rule |
| `net_amount` rows the rule actually moves | 99 of 23,413 |

So the arithmetic change is small, bounded and measurable. That is the good news.

### The consequence that is not small

**You cannot have both "every printed row is 2 dp" and "the footer equals the sum of the printed
rows"** unless you round per row. Round once at the end and the footer deliberately stops matching the
column — which is the exact defect class the gate
`tools/verify-spool-reports.mjs` was built to prevent ("a report whose footer disagrees with its own
body is wrong even when the disagreement is one paisa, because the footer is what an operator
trusts").

Three ways out, and this is the decision:

1. **Defer the intermediate rounds and accept the new footers.** Simplest, matches the instruction.
   52 printed invoice totals and one profit total change; the gate's "total == sum of the printed
   column" check has to be replaced with one that compares against the *unrounded* sum.
2. **Print 2 dp, total the unrounded values.** Both are defensible, but the page then shows a column
   whose visible sum does not equal the footer. Fine for an operator who trusts the footer; alarming
   for one who adds up the page.
3. **Print more precision.** Round only for display in the template, keep the column unrounded in the
   data. This removes the conflict at the cost of a uglier page.

Whichever is chosen, it is a **business** decision about what a printed report means, not a
refactor — which is why it is written down here rather than just changed.

### What is not a rounding site

The totals statement accumulates `SUM(CAST(x * 100 ± 0.5 AS INTEGER))` — **integer paisas** — so its
accumulation is exact and order-independent. There is no float drift to fix there, and no gain from
touching it. (This is also why the totals pass could drop the report's `ORDER BY`:
[[paymentsbycompany-performance-2026-10-02]].)

## 2. SQL views: one directive, three different situations

> **Scope corrected 2026-10-02.** "Remove all views" means **no SQL `VIEW` object inside the TrailBase
> SQLite database**, with the `.sql` files under `app/reports/sql/` queried per `meta.json` — *not*
> the `views/*.sql` directory discussed in 2a. Read that way, 2b is the only real obstacle and it is
> bigger and simpler than it looked. Rounding is explicitly left as-is for now.

### 2b. The only three `VIEW`s in the database belong to the document store

```sql
SELECT name FROM sqlite_master WHERE type='view';
-- document__item_src, document__party_src, document__voucher_src
```

Those are the entire list, and they belong to the general document store
(`U1790401000__general_document_store.sql`). The store is **not read by anything today**:

| Question | Answer |
|---|---|
| Rows in `document` | **36,603** — 26,526 vouchers + 8,927 invoices + 943 parties + 207 items |
| `SELECT … FROM "document"` anywhere in the guest | **zero** |
| Exposed as a record collection in `config.textproto` | **no** |
| Kept current by | **12 triggers** — `document__{voucher,party,item,invoice}_{insert,update,delete}` on `payments`, `parties`, `items` and `inv_doc` |
| Read by the app instead | `inv_doc` (8,927 rows), which the print path and `queue.js` actually query |

> **SUPERSEDED 2026-10-02 - the store was dropped, and the first recommendation here was wrong for the
> wrong reason.** It recommended deleting the store on "unread, therefore vestigial", without checking
> what the store was *for*. The store was deliberate, resolved, verified work
> ([[document-store-and-streaming-render]]); it was unread because its consumer was not wired up, not
> because it was abandoned. The **decision** then came from the plan rather than the evidence: the
> document path is not being built beyond invoices, so no consumer ever arrives. Migration
> U1790600000 dropped the table, its 12 triggers, its 3 views and 36,603 rows, and TrailBase's SQLite
> now holds no VIEW at all. See [[document-path-stops-at-invoices]].
>
> The reasoning that survives: a trigger-maintained document cannot be replaced by a guest-written
> cache, because payments, parties, items and invoices are all writable through TrailBase's
> record API and a write there never runs the guest.
So the instruction still bites, but the answer is not "drop the store". A SQLite trigger cannot read a
`.sql` file, and the triggers are the maintenance mechanism by design. The route that satisfies both
constraints is to **keep the store and generate the trigger bodies from the `.sql` file** at migration
time: the projection stays defined once, the database ends up with no `VIEW`, and the nine trigger
bodies stop being hand-maintained copies.

**What the 12 triggers cost meanwhile**, measured on a copy of the depot by dropping them and
re-running the same UPDATEs:

| Write | With the triggers | Without | Saved per write |
|---|---|---|---|
| `payments` row | 10.07 ms | 5.10 ms | **~5 ms** |
| `parties` row | 3.29 ms | 0.13 ms | **~3.2 ms** |
| `items` row | 2.79 ms | 0.28 ms | **~2.5 ms** |

(These absolute figures include the harness re-preparing each statement, so they are inflated; the
**difference** is the meaningful number, and it is consistent in direction and size across all three
tables.) Every payment, party and item write builds a JSON document no screen currently shows. That is
a legitimate cost to reconsider **when the document path is built and starts reading them** — and a
poor reason to delete the store before then.

This needs a decision rather than a refactor: it is a migration that **drops a table and its
contents**.

### 2c. `meta.json` currently names JavaScript views — that is the architecture gap

`app/pages/reports/paymentsbycompany/meta.json`:

```json
"needs":   { "views": ["paymentsInvoicesReport", "invoiceView", "refs"] },
"compute": { "report": "paymentsbycompany" }
```

`needs.views` names views from `compute/views.js` — **JavaScript** — and `compute.report` names the
SQL statement. So one page does both: the guest builds views in JS, then runs a spooled SQL report
that re-derives the same shapes from `prelude.sql`. `refs` is the only one with no `.sql` equivalent;
`counts_for_row_numbers.sql` already exists for the dashboard's `counts`.

This is not a change of direction — it is **step 14 of the migration plan**, which states that the
component split deletes `compute/reports.js`, `compute/views.js` and `app/lib/reports.js` and is
*gated* on a golden-output corpus plus an N-way differ existing first
([[guest-parity-differential-not-reproducible]]). The gate is what is missing, not the intent.

### 2a. `runtime/app/reports/sql/views/` — 15 files, dead code. **Deleted 2026-10-02.**

Kept as written above: `USE_SQL_VIEWS = false` with both maps empty, so `sqlviews.js` is never called
and nothing loads those files. Under the corrected scope they are not "views to remove from SQLite" —
they are dead files, and a second divergent definition of every view.

**Done.** The directory, `sqlviews.js`, its wiring in `reports.js`, and the six tools that existed to
compare those files (`verify-legacy-views.mjs`, `view-equivalence.mjs`, `verify-guest-only-views.py`,
`verify-translated-views.py`, `translate-enums.mjs`, `extract-legacy-views.mjs`) are gone — see
[[legacy-parity-checks-waived]]. `compute/views.js` stays for now: it is still what builds `counts`
and `refs` at runtime.

### Why it survived the previous sweep

`vault/tasks/tb-0031-remove-proven-dead-code.md` states its own rule: *"Every deletion here is backed
by a repo-wide occurrence count of 1 — the declaration itself."* That measures **references**, not
**reachability**, and the gap explains all of it:

- `sqlviews.js` is genuinely imported by `reports.js`, so it has a live caller and the scan was right
  that it is *referenced*. It is never *called*, because `USE_SQL_VIEWS = false`. A static import
  graph cannot see through a constant-false feature flag.
- `compute/views.js` and `compute/reports.js` were kept **deliberately** — "the documented escape hatch
  (`report-pages.useJsFor`) and the parity reference the `verify-spool-*` gates import."
- `views/*.sql` are read by five verification tools, so the orphan scan did not flag them. They are
  used by the test suite, not by the app.

The `document` store is the same class of finding and was never in scope: it is SQL, and it looks
alive because 12 triggers maintain 36,603 rows of it.

## 3. The other findings

**The prelude's size is a readability problem, not a speed one.** Preparing the full composed
statement costs **3.90 ms**, of which the prelude alone is **0.73 ms** — against roughly 500 ms of
execution. Splitting the prelude per report buys ~4 ms. It is still worth doing for legibility: the
prelude is 25 CTEs and most reports reference only **1–3** of them (`paymentsbycompany` uses 7,
`dailysale` 2, `outstanding` 1). Report that measurement rather than claiming the prelude is a
bottleneck.

**The type filter can be an integer test.** Six reports filter with

```sql
(CASE pb.type WHEN 0 THEN 'purchase' WHEN 1 THEN 'sale' WHEN 2 THEN 'return' ELSE CAST(pb.type AS TEXT) END)
  IN ('sale', 'return', 'recieving')
```

The JS reference is `typeMap = { 0: "purchase", 1: "sale", 2: "return" }` with `?? p.type`, so type 3
labels as `"3"` and is excluded by both paths — the SQL is faithful. But the whole expression is
equivalent to `pb.type IN (1, 2)`. Cheaper per row on 13,862 rows, and a reader no longer has to
decode a four-way string CASE to learn that a payment type is being filtered. Cheap, safe, do it
whenever the rounding decision is being made anyway.

**No missing index was found.** Every column the reports filter or join on is already indexed:
`transactions(invoice, item)`, `payments(payment_date, invoice, party, paid, type)`,
`invoices(dated, type, party, booker)`, `parties(area, type)`, `items(category)`.

**`difference_party` scans `parties` for `LOWER(TRIM(name)) = 'difference'`** with no index on
`name`. It is a CTE, so SQLite evaluates it only for the reports that reference it (`stockreport`,
`difference`, `itemsales`, `productsale`) and it is a 943-row scan when it does. Not worth an index.

## 4. Recommended order

Rounding is **not** in this list — it is left as-is by decision (2026-10-02), and the analysis above
is kept so the cost is known if that changes.

1. ~~Settle the three SQLite `VIEW`s.~~ **Done 2026-10-02**: the document path stops at invoices, so
   the store was dropped entirely — table, 12 triggers, 3 views, 36,603 rows. The database now holds
   **no `VIEW` at all** ([[document-path-stops-at-invoices]]).
2. ~~Delete the dead `views/` directory, `sqlviews.js`, its wiring and `verify-translated-views.py`.~~
   **Done 2026-10-02** — [[legacy-parity-checks-waived]].
3. Replace the label CASE with `pb.type IN (1, 2)` in the six reports that carry it. **Not done.**
4. **[[tb-0032-manifest-first-refactor]]** — `meta.json` names the `.sql` files: `refs` gets a SQL
   equivalent, `counts` reads `counts_for_row_numbers.sql`, then `compute/views.js` and
   `app/lib/reports.js` retire. The parity half of its old gate is waived.