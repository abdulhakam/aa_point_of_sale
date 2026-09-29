---
title: Report logic stays runtime file-based; only the data pass moves to SQL
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
tags: [reports, sql, no-build, authoring, performance, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-report-performance-options]]", "[[guest-app-host-port]]", "[[trailbase-guest-wasm-runtime-defaults]]", "[[trailbase-drop-sql-views]]", "[[compiled-artifacts-are-generic-capabilities]]"]
---

# Report logic stays runtime file-based; only the data pass moves to SQL

## The concern

Speeding reports up by pushing arithmetic into SQL (and the render into Rust) looks like it would
break the platform's core promise: **report logic editable with no component rebuild**
(D2 in [[trailbase-guest-wasm-runtime-defaults]]).

## The distinction that resolves it

"No-build" means **no component rebuild**, not "no file or data change". TrailBase's own schema is
already data applied at startup (migrations); the app's pages, views, compute and route files are
already files read at runtime. Moving arithmetic to SQL keeps that property **if the SQL is a
runtime artifact**, not something compiled into the wasm.

## Decision

1. **Report *logic* stays in the runtime authoring surface** — `app/compute/*.js`,
   `app/reports/*.sql`, `app/pages/*/meta.json`, `app/views/**/*.html`. Editing a report is editing
   files under `app/`; the component is never rebuilt. This is unchanged from today.
2. **The scan/aggregate moves into SQL**, executed at runtime. Two acceptable placements:
   - **Preferred (instant edits):** the SQL lives as text under `app/` (a `.sql` file, or built by
     the runtime JS) and is executed per request with the filters as **bound parameters**. Editing
     it is a file edit — same live-edit behaviour as `compute/*.js` today.
   - **Optimization layer (apply-step):** SQLite `VIEW`s or materialised tables created by
     **migrations**. Better planning and they can be exposed as typed record APIs, but a change is
     a migration apply (a data/config change, still **not** a component rebuild), and the depot's
     migration-staleness caveat applies ([[trailbase-stale-depot-skips-migration]]).
3. **The JS keeps deciding *what* to compute and how to format it.** A report function becomes
   "resolve filters → emit/execute the SQL → shape the last mile → hand rows to the template",
   instead of looping over in-memory arrays. Logic that SQL expresses badly stays in JS; SQL does
   the row scanning and aggregation.
4. **The Rust renderer stays generic** — `render(templateName, data)`. Adding or changing a report
   is a new template + a new SQL/JS file, not a Rust change.

## Per-report strategy: SQL, JS/TS, or hybrid (all runtime, no rebuild)

The choice is **per report**, declared in its manifest, not an architecture-wide commitment:

```jsonc
// app/pages/<slug>/meta.json
"compute": { "report": "profit", "strategy": "sql" }        // or "js" | "sql+js"
```

- `strategy: "sql"` → run `app/reports/<name>.sql` (or the SQL the report module returns) with the
  filters bound. Correct default: scanning, joining and aggregating in SQLite (C).
- `strategy: "js"` → run a runtime JS/TS module (`app/compute/<name>.js` or `.ts`). Use it when a
  computation is awkward or impossible in SQL. **TypeScript is fine** — the host already transpiles
  `.ts` route files with swc at runtime, and the same loader handles `app/` modules; editing a
  `.ts` report is still a file edit, not a rebuild. (This is an argument for caching the
  transpile — [[dispatcher-transpiled-per-request]] — so per-request swc does not tax it.)
- `strategy: "sql+js"` → SQL does the scan/join/aggregate, JS does the last mile and formatting.

Switching a report between strategies is a manifest edit. The guest dispatches on `strategy`; both
paths already exist (the SQL bridge and the runtime JS evaluator), so no new host capability is
needed.

**Performance guidance for the JS path:** the guest is an interpreter with a ~20 s call deadline
([[trailbase-guest-cpu-js-limits]]), so JS is for **logic-heavy, data-light** work. If a JS report
must scan a lot, either let SQL pre-aggregate and keep JS to the last mile (`sql+js`), or run it
**off the request path** as a job step over the durable queue with the existing worker fan-out
([[jobs-in-process-durable-queue]]). A `.js` report is also only a rename away from `.ts` if types
are wanted.

**The only thing that is still a component change** is a *new native capability* — a new Rust
bridge function or a new `minijinja` filter. Report logic in SQL/JS/TS never is.

## What is genuinely lost

- **A brand-new `minijinja` *filter*** (beyond the ten ported ones) is a Rust change → a rebuild.
  Keep the filter set generic; do bespoke formatting in JS before handing data to the template.
- **SQL-inexpressible logic** has to stay in JS — which is still runtime-evaluated, so it costs
  authoring convenience, not the no-build property.
- Instant edits vs the apply-step for SQL views/materialised tables: choose per report; the default
  (SQL text under `app/`) keeps edits instant.

## Why this is a restoration, not a regression

The original system already did exactly this: PocketBase expressed the report arithmetic as **SQL
views applied by migrations** (`payments_view`, `transaction_view`, `ledger_*`, and even a
window-function ledger) — data, not a build. The arithmetic only moved into JS because TrailBase
dropped the views when this pair was built ([[trailbase-drop-sql-views]]). So "SQL for the
arithmetic" is the historical model, and the current JS-array recomputation is the deviation.

## Consequences

- A report change is: edit `app/reports/x.sql` + `app/views/...` (+ maybe `app/compute/x.js`) →
  live, no rebuild — **and** the arithmetic runs in SQLite (C) instead of QuickJS.
- The component only changes for architecture (new route shape, new filter, new capability), never
  for report logic — preserving the plan's authoring goal.
- Requires the SQL to be parameterised (filters) and reviewed like any `app/` code.

## Evidence

- `backend/pb_migrations/*_updated_*_view.js`, `1789890300_ledger_party_window_function.js`,
  `1789890310_payments_summary_view.js` — the arithmetic as migration-applied SQL.
- [[trailbase-drop-sql-views]] — why the JS port exists.
- [[guest-report-performance-options]] — the perf case for this move.

## Related

- [[guest-report-performance-options]] — the ranked plan this constrains.
- [[trailbase-guest-wasm-runtime-defaults]] — the D2/D4 authoring goal.
