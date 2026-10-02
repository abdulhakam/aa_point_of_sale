---
title: The manifest-first workflow is half-built — the SQL half still lives in JavaScript
type: note
status: active
created: 2026-10-02
tags: [architecture, manifest, meta-json, quickjs, jinja, spool, dead-code, technical-debt]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[sql-review-2026-10-02]]", "[[tb-0031-remove-proven-dead-code]]", "[[trailbase-migration]]", "[[reports-and-ledgers]]", "[[legacy-sql-views-differ-from-js-views]]", "[[component-split-and-sql-materialised-tables]]", "[[a-reports-totals-come-from-a-sqlite-statement-that-wraps-the-report]]"]
---

# The manifest-first workflow is half-built — the SQL half still lives in JavaScript

2026-10-02. The intended workflow, stated by the owner:

> report requested → manifest says **those SQL files** and **this jinja template** → QuickJS runs
> the queries loaded from those files, gets their result locations, passes them to jinja → jinja
> finishes the template → QuickJS responds.

Plus a second workflow: **handlers** — JavaScript the manifest points at, for the pages that need it.

Measured against that: the **template half is manifest-driven, the SQL half is not**, the
**handlers workflow does not exist**, and there is a **second implementation of the whole view layer
in JavaScript**.

## The inventory

| | |
|---|---|
| `runtime/**/*.js` | **26 files, 5,393 lines** |
| `runtime/ahscripts/routes/_app/route.ts` | **1,821 lines**, and it wires all 58 routes by hand |
| manifests | 14, keys: `title`, `template`, `hub`, `needs`, `compute`, `filters`, `columns`, `totals` (+3 one-offs) |
| manifests declaring handlers | **0** |

## 1. The manifest names a report *key*, not a SQL file

`app/pages/reports/paymentsbycompany/meta.json`:

```json
"template": "page.html",
"needs":    { "views": ["paymentsInvoicesReport", "invoiceView", "refs"] },
"compute":  { "report": "paymentsbycompany" }
```

`compute.report` is a **key**. Resolving it is `app/lib/spoolreports.js`'s `REPORTS` registry, and
that registry — 737 lines of JavaScript — is where the actual definition lives:

```js
paymentsbycompany: {
  sql: "payments_by_company.sql",     // <-- the file the manifest does not name
  cols: ["id", "date", "type", …],    // <-- what the SQL must return
  totals: { cents: {…}, derived: {…} },
}
```

So **which SQL file runs, which columns it returns and how they are totalled are all decided in
JavaScript**, and the manifest is one indirection away from them. That is the single biggest
structural mismatch with the intended workflow, and it is 737 lines.

The manifest *does* carry `columns` and `totals` — but for **display** (headers, which totals block
renders), not for execution. `verify-spool-reports.mjs`'s `verifyPageColumns` is what stops the two
copies from drifting, which is a real safeguard and worth keeping.

What already matches the intent: the statement is spooled to a KV key and jinja reads it **by
address**, so rows never cross into QuickJS. That part is right.

## 2. The "handlers" workflow was never wired up

No manifest declares handlers. Instead `route.ts` loads **22 modules by path** into one object:

```ts
entities, data, pages, plugins, management, invoicing, lifecycle, invoices, expenses,
payments, inventory, service (reports.js), spooled (spoolreports.js), http, renderClient,
reportPages, routeKit, views (compute/views.js), format, ids, qtyAsText
```

…then a 1,821-line `switch` decides what runs. So the 20 `app/lib/*.js` files are not manifest-declared
handlers, they are **a hand-maintained call graph**. The "handlers in this directory" indirection —
which is what would let a page be added without touching the dispatcher — does not exist.

## 3. A second implementation of the view layer

| File | Lines | Why it exists |
|---|---|---|
| `app/compute/views.js` | 621 | Builds 14 views. **Live for `counts`, `refs`, `itemsReport`** and whatever `needs.views` names; also the parity reference the gates import |
| `app/lib/reports.js` | 371 | Snapshot/fingerprint reader over the above |
| `app/lib/sqlviews.js` | 101 | **Dead** — `USE_SQL_VIEWS = false`. **Deleted 2026-10-02** |

`prelude.sql` re-derives the same shapes in SQL for the 14 report statements. The JS copies are
requested at runtime in only five places, all in `route.ts`: `getViews(["counts"])` for the dashboard
tiles, `getViews(["refs"])` for the filter dropdowns, and `getViews(def.needs.views)` for the
`/p/<slug>/data` endpoint.

So roughly **1,500 of 5,393 JS lines (28%)** are a registry that should be manifest data plus a view
layer the SQL path does not use.

## 4. Why the earlier sweep could not see it

[[tb-0031-remove-proven-dead-code]] deleted on a repo-wide **occurrence count of 1** — the
declaration itself. That measures references, not reachability:

- `sqlviews.js` is imported by `reports.js`, so it is referenced. It is never called.
- `USE_SQL_VIEWS = false` is a constant no import graph can see through.
- `compute/views.js` and `compute/reports.js` were **kept deliberately**, as "the documented escape
  hatch and the parity reference the `verify-spool-*` gates import" — the note says so in as many
  words.
- `views/*.sql` are read by five verification tools, so the orphan scan did not flag them.

Nothing in the repo measures "loaded but never called", which is the class all of this belongs to.

## 5. What a manifest-first version removes

Not proposed as work yet — this is the shape of it, with the sizes measured rather than guessed.

| Today | Manifest-first |
|---|---|
| `spoolreports.js` 737 lines: registry + SQL text + column manifest + totals rules + paisa helper + bench | a loader: read `meta.json`, read the `.sql` files it names, spool them, hand the keys to jinja — order 150 lines |
| `sqlviews.js` 101 | deleted |
| `compute/views.js` 621 | `counts` and `refs` need a `.sql`; `counts_for_row_numbers.sql` already exists, `refs` does not. Then deleted |
| `app/lib/reports.js` 371 | a small fingerprint/snapshot reader; the gate reference moves to the `.sql` files |

The gate problem is unchanged and is what step 14 of [[trailbase-migration]] already names: deleting
the JS views removes the parity reference, so a **golden-output corpus and an N-way differ must exist
first**. That gate, not the intent, is what is missing.

> **The parity half of that gate was waived on 2026-10-02**
> ([[legacy-parity-checks-waived]]), so step 14 is unblocked. `sqlviews.js` and the 15 legacy view
> files are already deleted. What remains before `compute/views.js` can go is no longer a
> correctness gate: it is that **`counts` and `refs` need `.sql` equivalents** — `refs` does not have
> one yet.