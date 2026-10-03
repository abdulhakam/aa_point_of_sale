---
title: "tb-0032 — Manifest-first: meta.json names the SQL files, and the JavaScript view layer retires"
type: task
status: done
priority: high
created: 2026-10-02
updated: 2026-10-03
tags: [trailbase, architecture, manifest, meta-json, quickjs, jinja, sql, views, cleanup, technical-debt]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[manifest-first-architecture-gap-2026-10-02]]", "[[legacy-parity-checks-waived]]", "[[sql-review-2026-10-02]]", "[[tb-0031-remove-proven-dead-code]]", "[[tb-0030-retire-the-route-ts-dispatcher]]", "[[reports-and-ledgers]]", "[[tb-0022-move-reports-to-sql]]", "[[trailbase-migration]]"]
---

# tb-0032 — Manifest-first: meta.json names the SQL files, and the JavaScript view layer retires

**This is step 14 of [[trailbase-migration]]**, unblocked by [[legacy-parity-checks-waived]].

## The workflow this task exists to deliver

Stated by the owner, 2026-10-02:

> report requested → manifest says **those SQL files** and **this jinja template** → QuickJS runs
> the queries loaded from those files, receives their result locations, passes them to jinja → jinja
> completes the template → QuickJS responds.

Plus a second workflow: **handlers** — JavaScript the manifest points at, for pages that need it.

## Why it is one large task

Measured 2026-10-02 across `trailbase/runtime`:

| | |
|---|---|
| JavaScript | 26 files, 5,393 lines — **after** the legacy views were deleted |
| The dispatcher | `ahscripts/routes/_app/route.ts`, **1,821 lines**, wiring all 58 routes by hand |
| Manifests | 14, keys `title`/`template`/`hub`/`needs`/`compute`/`filters`/`columns`/`totals` |
| Manifests declaring handlers | **0** |
| `meta.json` naming a `.sql` file | **0** |

Three structural gaps, each of which is a separate piece of work:

1. **The manifest names a report *key*, not a SQL file.** `compute: {"report": "paymentsbycompany"}`
   resolves inside `app/lib/spoolreports.js`'s `REPORTS` registry (737 lines), which is where
   `sql: "payments_by_company.sql"`, the column manifest and the totals rules actually live. Which SQL
   runs is decided in JavaScript, one indirection away from where it belongs.
2. **The handlers workflow was never wired up.** `route.ts` loads 22 modules by path into one object
   and a hand-written `switch` decides what runs, so the 20 `app/lib/*.js` files are a
   hand-maintained call graph and a new page cannot be added without touching the dispatcher.
3. **A second implementation of the view layer exists in JavaScript.** `app/compute/views.js`
   (621 lines, 14 views) and `app/lib/reports.js` (371) build what `app/reports/sql/prelude.sql`
   re-derives in SQL for every report.

## Definition of done

- [ ] `meta.json` carries the **SQL file path** (and its binds) for every report page, so the
      statement a page runs is readable from the manifest with no JavaScript lookup.
- [ ] `spoolreports.js` is a **loader**, not a registry: read the manifest, read the `.sql` files it
      names, run them, hand the spool keys to jinja. Its `REPORTS` table of hand-written `cols` and
      totals rules is gone — the manifest's `columns`/`totals` are the single declaration.
- [x] **`refs` has a `.sql` equivalent** and the filter dropdowns read it. **Done 2026-10-02** — see
      phase 1 below.
- [ ] `compute/views.js` and `app/lib/reports.js` are deleted; the dashboard's `counts` reads
      `counts_for_row_numbers.sql`, and the snapshot/fingerprint service shrinks to what a SQL
      statement cannot do.
- [ ] At least one page is served through a **manifest-declared handlers directory**, and the
      dispatcher resolves it by manifest rather than by a hard-wired path.
- [ ] `tools/verify-spool-reports.mjs` still passes, and `references/build-and-run.md` describes how
      the system is actually wired.

## Sequencing, in the order that keeps the app working

### 1. ~~`refs` as SQL.~~ **Done 2026-10-02**

`app/sql/refs.sql` is now the definition — nine `(ref_key, table_name)` pairs — read by
`app/lib/refs.js`, which caches on the data fingerprint. `compute/views.js`'s `buildRefs` and its
`VIEW_DEPS.refs` entry are **deleted**, along with the `case "refs"` in `buildView`. The four
`getViews(["refs"])` call sites in `route.ts` and `route-kit.refs()` now go through the new loader.

Those two JavaScript definitions named the same nine tables twice, which is the duplication class
this task exists to remove. The `.sql` file is a table of pairs rather than a hand-written statement
per table because the nine tables have different column counts and so cannot be `UNION ALL`'d with
`SELECT *`; spelling out each table's columns would duplicate `pragma_table_info` and drift on the
first migration that adds one. The definition moves to SQL, the transport stays shared, so the
normalisation is identical **by construction** rather than by agreement.

Verified:

| Check | Result |
|---|---|
| `/bench/refs` before the swap | `identical: true` — 9/9 keys, same counts, same first and last ids |
| Every page with a dropdown (23 of them) | all `200`, every populated `<select>` has options: parties 944, bookers 5, areas 71, items 207 |
| `verify-spool-reports.mjs` | 14 passed, 0 failed, 72 binds verified |
| `guest-smoke.mjs` | **every check passes** ⚠️ — this note previously gated on "71/78, 7 known money failures". Those failures were the draft-invoice defect and are fixed; the suite now passes in full. Do not reintroduce a count ([[smoke-count-is-not-a-hard-coded-number]]) |

`/bench/refs` no longer compares against JavaScript — that is gone — so it now guards the failure
mode that actually matters: **a dropdown that silently renders empty**. It asserts every key present,
every value an array, and reports any empty list. Counts are reported, not asserted, because the
shop's master data grows and a hard count would fail for the wrong reason.

**One smoke check had to change, and it is worth reading.** `guest-smoke.mjs` asserted
`lastRefresh.rebuilt` includes `"refs"` — true only while `refs` was a view, and `sections` fed
nothing else. It now asserts `paymentsInvoicesReport` (the incremental property, stated against a
table the suite actually wrote) **and** that `refs` is *absent* from the rebuilt set, which is a
regression guard for the swap: if it ever reappears, something is building refs twice.

Observed flakiness, recorded so the next session does not chase it: the check
`page data revalidates an unchanged filtered result` failed on one run of this code and passed on the
next, with no change between. Independently verified on the production server that the mechanism is
sound — `/p/reports/profit/data` answers `200`, then `304`, then `304` on `If-None-Match`.

### 2. Move the SQL registry into the manifests — **done 2026-10-03**

Every report page's `meta.json` now carries a `spool` block, and `app/lib/spoolreports.js` no longer
contains a hand-written table of reports:

```json
"compute": { "report": "paymentsbycompany" },
"spool": {
  "sql":    "payments_by_company.sql",
  "binds":  { "agg": "difference" },
  "row":    ["id", "date", "type", ...],
  "totals": { "cents": { ... }, "derived": { ... } }
}
```

The 14 entries were **extracted from the registry by script**, not retyped, so the manifest cannot
disagree with the code that was running. Four shared SQL fragments — `PAY`, `SALES`, `BYCOMPANY`,
`ITEMSALES` — are gone entirely: each manifest carries its own `totals.cents`, already spread. Those
constants were the duplication this task exists to remove, since three reports shared
`payments.sql` *and* its totals buckets.

The module is now a **loader**: it walks `app/pages/**/meta.json` through the same host `fs` global it
already used for the `.sql` files, and caches the result. `names()` and `totalsSpec()` became async
because the registry is built on first use; the four `names()` call sites in `route.ts` now await it.

⚠️ **The first design was wrong and the failure mode was total.** The registry was initially built from
manifests *injected* by `route.ts` at module load. That put a load-order requirement between two
modules for no benefit, and when it did not hold, **every route 500'd** — including `/healthz` — with
the real cause 20 lines away in a 200,000-line server log. A module that reads its own input has no
ordering to get wrong. Recorded because the instinct (inject for testability) is wrong specifically when
the consumer can already reach the source, and the cost is not proportional to the mistake.

#### The field the migration dropped

The first fidelity check compared a **hand-picked** field list (`sql`, `row`, `salesOnly`, `totals`) and
printed **IDENTICAL** — while `agg` was absent from every manifest. `stockreport` and `difference` share
`items.sql` and differ **only** by that bind, so `params()` bound the empty string and the statement ran
unrestricted: **`difference` silently rendered the wrong rows.** Caught by the smoke check *"difference
report counts only difference invoices"*, and confirmed real rather than the documented flake by
restoring `HEAD` (78/78) and re-applying the change (77/78, same check, three runs).

The check now compares the **union of every field any entry used** — `agg`, `cols`, `salesOnly`, `sql`,
`totals` — in both directions, so a field cannot be dropped without it appearing as missing. A
hand-picked list is a list that will miss the next field.

#### Gate

| Check | Result |
|---|---|
| `verify-spool-reports.mjs` | **14 passed, 0 failed, 0 not ported**, 72 binds verified |
| `route-snapshot.mjs` | 49 routes, **0 erroring**; all 14 report and ledger pages 200 |
| diff vs the pre-change snapshot | **1 difference**: `page profit data` `version=0` → `1`, same keys. The rendered-page cache keys on the code revision (`f50d0554`), so a code change bumping it is the feature working |
| `guest-smoke.mjs` | **every check passes** — see [[smoke-count-is-not-a-hard-coded-number]] rather than a figure |
| migration fidelity | 14/14 entries identical on all five fields |

### 3. Delete the JavaScript view layer — **the live consumers are gone (2026-10-03)**

Four call sites still asked `app/lib/reports.js` `getViews([...])`. Two of them wanted data, and two
wanted only the snapshot's `version` counter:

| Call site | What it actually used | Now |
|---|---|---|
| `/dashboard` | `counts` — eleven row counts | `A.baseviews.counts()` → `app/sql/counts.sql` |
| `/invoice/context` | `itemsReport` rows | `A.baseviews.itemsReport()` → `app/reports/sql/items_report.sql` |
| `/inventory` | `itemsReport` rows | `A.baseviews.itemsReport()` |
| `/p/<slug>/data` | **only** `snap.version` for the ETag | `A.service.dataVersion()` |

`app/lib/baseviews.js` serves the first two. It is deliberately **not** a report page — no manifest, no
render, no totals block — but `sqlite.all` returns positional arrays with no column metadata, so it
names each statement's columns in SELECT order and `columnsToObjects()` **refuses a width mismatch**. A
statement that gains or loses a column is a loud error, not a row of shifted values.

`items_report.sql` reuses the prelude's `stock_deltas` rather than re-deriving the sign rules. Re-deriving
them would create a third copy of the arithmetic and a way for two to disagree — which is the failure
class this task exists to remove.

#### The version counter was wrong twice

`/p/<slug>/data` and `/invoice/context` keyed their ETags on the snapshot's in-memory version **counter**.
It ticked when the refresh job ran, not when the data changed, and it was per-process, so two runtime
threads disagreed. Both now key on the data **fingerprint**, folded to a 31-bit FNV-1a —
`A.service.dataVersion()`. `version` stays a **number**, which is the shape `/p/<slug>/data` has always
published. (Slicing the fingerprint string instead produced `"[[\"areas\",\"0"` — a double-encoded JSON
fragment — in both a payload and an ETag.)

`/p/<slug>/data` also stopped hydrating the views its manifest declared. Nothing in that route used the
snapshot except the version: the rows come from `spooled.jsonPayload`, which reads base tables through
the prelude. The server log no longer shows `[mview] hydrate 3/3 views` on that route.

#### `/bench/report`

Kept — `tb-0030` says so and `tools/split-bench.mjs` calls it. But its table list came from
`A.views.tablesForViews(page.needs.views)`, a hand-written provenance map naming views that are no longer
a layer. It now derives the answer from the SQL, in two steps that were both wrong first:

- Scanning the **composed** statement answers correctly but uselessly: the prelude is shared, so all ten
  reports returned the identical set (areas, companies, expenses, invoices, items, order_bookers, parties,
  payments, sections, transactions). True, and not a per-report property.
- Scanning the **report's own body** is the per-report answer, with prelude-defined CTE names filtered out
  so `FROM stock_deltas` does not read as a table:

  ```text
  profit         -> [areas, companies, items, order_bookers, parties, sections]
  payments       -> [areas, order_bookers, parties, sections]
  stockreport    -> [companies, items]
  difference     -> [companies, items]
  ledgers/general -> []
  ```

- Comments must be stripped **before** scanning. The prelude documents its own provenance in prose, and a
  `-- … FROM the … AS (…)` line parses as perfectly good SQL: the first version answered
  `[…, sections, the, transactions_report]`, where `the` came from a comment and `transactions_report`
  from a CTE it could not see.

#### Gate

| Check | Result |
|---|---|
| `verify-spool-reports.mjs` | **14 passed, 0 failed**, 72 binds verified |
| `route-snapshot.mjs` | 49 routes, **0 erroring**; no `mview` hydration |
| diff vs baseline | 1 line: `page profit data` `version=0` → `627931119` (the fingerprint-derived version) |
| `guest-smoke.mjs` | every check passes |

#### Done: `views.js` retired from the shipped app

`app/compute/views.js` is **deleted**. The builders moved to
**`trailbase/tools/_src/legacy-views.js`** — moved, not deleted, because `tools/verify-prelude.mjs` is
the only check that the prelude's CTEs still compute what the legacy arithmetic computed. Exact parity
being waived ([[legacy-parity-checks-waived]]) is not the same claim as the SQL being unchecked, and the
builders are a **verification fixture**, not application code. Leaving them under `runtime/` shipped a
module nothing calls into every depot and evaluated it for no benefit.

Two consequences of the move, both caught by the gates:

- The fixture imports `format.js` and `ids.js` **from the runtime**, at
  `../../runtime/app/compute/*.js`. Copying them into `tools/_src/` was the first attempt and was wrong:
  a second copy of `round2` is a second answer to "what does rounding do".
- `tools/verify-spool-reports.mjs` had a **dead import** of six builders, left from when it was a
  JS-vs-SQL differential. Deleted.

`app/lib/reports.js` shrinks from **376 lines to ~150**. What it is now: the data fingerprint, the
31-bit `dataVersion()`, a refresh job that probes and diffs, and `status()`. Everything that existed to
build, persist, hydrate or invalidate a *view snapshot* is gone, including the `mview` / `mview_meta`
tables and `[mview] hydrate` / `[mview] persist` log lines.

⚠️ **`TABLES` and `readTables` are imported from `app/lib/data.js`, not restated.** The first version
hand-wrote a seventeen-table list and had already drifted — `data.js` carries `party_types`,
`invoice_types` and `payment_types`, and notes that **there is no `categories` table at all**.
Hand-writing it is the duplication this task exists to remove, done inside the task that removes it.

`ensureTables` / `baseTable` **stay**: `needs.tables` is derived from each filter's `source` and is
non-empty for 13 of the 14 pages, so `/p/<slug>/data` genuinely ships base-table rows in `payload.tables`.
They now read on demand and are cleared by `invalidate()`, so a write cannot leave a stale item list.

#### A check that outlived its subject

`guest-smoke.mjs` asserted *"incremental refresh rebuilds the affected views"* against
`lastRefresh.rebuilt`. `rebuilt` is now always `[]` — there is nothing to rebuild — so the suite went red
for a **correct** implementation. This is the same mistake the check's own comment describes one layer
back ("asserting the removed detail would keep the check red for a correct implementation"), so the
lesson is now written into the replacement:

- **"refresh is scoped to what actually changed"** — a write to `sections` must move the fingerprint and
  must not be reported as a change to all 17 tables.
- **"refresh publishes a fingerprint for every table it probes"** — asserted on `fingerprints` as the
  COUNT it is. The first attempt asserted it was an array, and failed against a working refresh.

#### Gate

| Check | Result |
|---|---|
| `verify-spool-reports.mjs` | **14 passed, 0 failed**, 72 binds verified |
| `verify-prelude.mjs` | **PASS — prelude matches the legacy builders** (the parity check still runs) |
| `route-snapshot.mjs` | 49 routes, **0 erroring**; no `mview` hydration anywhere |
| diff vs baseline | 1 line: `page profit data` `version=0` → the fingerprint-derived integer |
| `guest-smoke.mjs` | every check passes |

### 4. Serve at least one page through a manifest-declared handlers directory — **done 2026-10-03**

The handlers workflow now exists. A page that needs its own JavaScript declares it:

```json
"handlers": ["handlers/openings.js"]
```

`normalizeMeta` validates the paths (rejecting absolute paths, `..` and NUL) so a malformed declaration is
a manifest problem rather than a 500. `route.ts`'s `loadPageHandlers()` resolves them relative to the
page's own directory and merges their exports; a page declaring none returns `null` and pays nothing.

**The page chosen was not arbitrary.** No other report page has page-specific code — the template comes
from the manifest, the SQL from `spool`, and the column and totals rendering is shared. The **general
ledger's opening balances** are this ledger's own logic, and they were split across two shared places:
the row builder in `app/lib/report-pages.js` (loaded by every report page) and an
`pageDef.openings ? … : null` branch in the dispatcher. That branch is the coupling handlers exist to
remove: the dispatcher knowing which page needed which bespoke behaviour.

They moved to `app/pages/ledgers/general/handlers/openings.js`. The row shape is byte-identical to what
it replaced. What makes it a genuine handler case rather than a ceremony: **the three figures are the
filter's, not the data's**, so there is nothing SQLite can supply — which is exactly what a handler is
for. The part that *is* a statement concern (binding them into the totals as `:openR` / `:openP` /
`:openC`) stays in `spool.totals.openings`.

### The defect wiring it exposed

With the handler loading but the row still reading `0.00`, the cause was not the handler:

> **The general ledger's opening balances have never worked.** `filtersFor()` looped `def.filters` only,
> and the general ledger declares `from` and `to`. So `openingRecievables`, `openingPayables` and
> `openingCash` were never placed in `filters`, which means **both** the opening row **and** the totals
> statement's binds always received `""`. The ledger rendered
> `Opening Balance — Recievables: 0.00 · Payables: 0.00 · Cash: 0.00` for every input, and the totals
> silently omitted the opening figures.

Two things hid it: the three inputs are not shown on the page, so there was no control to move and no
visible symptom; and the names **were** declared in every manifest — under `spool.totals.openings` —
but `normalizeMeta` did not expose `spool`, so the declaration was read by the report loader and by
nobody else.

The fix is two lines of plumbing rather than a new input path:

- `normalizeMeta` now exposes `spool`, so a page's SQL declaration is reachable from the page layer.
- `filtersFor` honours `spool.totals.openings`: each declared name is read from the query string when
  present. Query-string only, and only when declared — the page's filter row is unchanged, because
  these are ledger inputs carried on a link, not on-screen controls.

Verified:

```text
/reports/ledgers/general?openingRecievables=1000&openingPayables=250.5&openingCash=7
  opening row: Opening Balance — Recievables: 1000.00 · Payables: 250.50 · Cash: 7.00
  totals: 1,000.00 present, 250.50 present
```

⚠️ This is one input of [[guest-frontend-feature-parity-gaps]] §4 — the ledger still cannot reproduce a
*historical* balance, because the openings are not persisted. Feeding them by hand now works; carrying
them forward is still the open decision.

#### Also removed

`needs.views` is gone from all **14** manifests. The field named derived views; the layer is gone,
`normalizeMeta` stopped reading it, and leaving it would mean every manifest declaring names for
something unresolvable. An empty `needs` was dropped too, leaving `needs` able to hold only `tables`.

#### Gate

| Check | Result |
|---|---|
| `verify-spool-reports.mjs` | **14 passed, 0 failed**, 72 binds verified |
| `verify-prelude.mjs` | **PASS — prelude matches the legacy builders** |
| `route-snapshot.mjs` | 49 routes, **0 erroring** |
| diff vs baseline | 1 line: `page profit data` `version` (the fingerprint-derived integer) |
| `guest-smoke.mjs` | every check passes |

## Risks, named

- **Every filter dropdown is touched by step 1.** An empty dropdown reads as "the report has no
  data", which is the same symptom as the defect fixed on 2026-10-02. Verify each page's dropdown
  lengths against what they are today before moving on.
- **`counts` feeds the dashboard tiles**, and those numbers were 0 for a whole day because a filter
  upstream silently removed every row. Step 3 must be checked against the tiles by eye, not by status
  code.
- **The JS views and the SQL prelude are known to diverge** on fresh/partial invoices — a sale
  invoice with an empty `dated`. That divergence was the reason the SQL path was adopted. Deleting the
  JS copies removes the divergence, but it also removes the thing that would have *revealed* a fresh
  regression in the prelude.
- **The gates are thinner after this.** `verify-spool-reports.mjs` is deliberately kept
  ([[legacy-parity-checks-waived]]), but nothing will compare a report against a previous result any
  more, so a wrong figure has to be noticed from the data.

## Evidence

- `vault/notes/manifest-first-architecture-gap-2026-10-02.md` — the inventory, the two indirection
  diagrams, and the measured sizes.
- `vault/decisions/legacy-parity-checks-waived.md` — what was deleted and what was deliberately kept.
- `vault/notes/sql-review-2026-10-02.md` — the SQL layer's own review.
- Baseline for step 2: all 14 report pages and 4 ledgers answer 200 in 91–141 ms, and
  `paymentsbycompany` for 1 Jan – 2 Oct 2026 gives `Payable Amount 6,950,631.20`.