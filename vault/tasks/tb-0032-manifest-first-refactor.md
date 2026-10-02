---
title: "tb-0032 — Manifest-first: meta.json names the SQL files, and the JavaScript view layer retires"
type: task
status: todo
priority: high
created: 2026-10-02
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
- [ ] **`refs` has a `.sql` equivalent** and the filter dropdowns read it. This is the last thing
      `compute/views.js` is needed for, so it is the blocking item.
- [ ] `compute/views.js` and `app/lib/reports.js` are deleted; the dashboard's `counts` reads
      `counts_for_row_numbers.sql`, and the snapshot/fingerprint service shrinks to what a SQL
      statement cannot do.
- [ ] At least one page is served through a **manifest-declared handlers directory**, and the
      dispatcher resolves it by manifest rather than by a hard-wired path.
- [ ] `tools/verify-spool-reports.mjs` still passes, and `references/build-and-run.md` describes how
      the system is actually wired.

## Sequencing, in the order that keeps the app working

1. **`refs` as SQL.** The only genuine blocker. Every filter dropdown on every report and ledger
   depends on it, so it is a behaviour change to 14 pages and wants its own review.
2. **Move the SQL registry into the manifests.** Add `sql`, `binds` and `cols` to each
   `pages/*/meta.json`; make `spoolreports.js` read them. Pure data movement — the statements are
   unchanged, so `verify-spool-reports.mjs` is the proof it worked.
3. **`counts` from `counts_for_row_numbers.sql`**, then delete `compute/views.js` and
   `app/lib/reports.js`.
4. **Handlers.** Pick one page, move its route body into a manifest-declared handlers directory, and
   have the dispatcher resolve it from the manifest. Then the remaining CRUD routes one at a time.
5. **`route.ts` shrinks** as routes move to manifests. 1,821 lines is the ceiling on how much of the
   dispatcher is genuinely hand-wired, and it should end up holding only what no manifest can say.

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