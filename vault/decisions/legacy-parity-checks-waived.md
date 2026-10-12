---
title: Legacy parity checks are waived — the old views and their gates are deleted
type: decision
status: accepted
decided_on: 2026-10-02
created: 2026-10-02
tags: [parity, dead-code, sql, views, tools, gates, technical-debt]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[sql-review-2026-10-02]]", "[[manifest-first-architecture-gap-2026-10-02]]", "[[tb-0031-remove-proven-dead-code]]", "[[guest-parity-differential-not-reproducible]]", "[[legacy-sql-views-differ-from-js-views]]", "[[tb-0022-move-reports-to-sql]]", "[[money-is-2dp-everywhere]]"]
---

# Legacy parity checks are waived — the old views and their gates are deleted

## Decision

**2026-10-02, owner: "we don't need parity checks for now."** The reports and views no longer have to
agree with the previous system's output, so the JavaScript implementation that existed to be compared
against is no longer needed, and neither are the gates that did the comparing.

Deleted:

| Deleted | Lines | Why it went |
|---|---|---|
| `runtime/ahscripts/reports/sql/views/*.sql` | 15 files | The legacy v1 view definitions. Loaded by nothing since `USE_SQL_VIEWS = false` |
| `runtime/ahscripts/lib/sqlviews.js` | 101 | The loader for them, behind the same false flag |
| `tools/verify-legacy-views.mjs` | | Composed and ran the 15 views |
| `tools/view-equivalence.mjs` | | The pure SQL-vs-JS row-multiset gate |
| `tools/verify-guest-only-views.py` | | Compared two guest-only views with the JS builders |
| `tools/verify-translated-views.py` | | Compared the enum-translated views with PocketBase |
| `tools/translate-enums.mjs` | | Rewrote those views; no input, no output now |
| `tools/extract-legacy-views.mjs` | | Extracted those views from PocketBase into the directory just deleted |

Plus the wiring in `app/lib/reports.js`: the `sqlviews.js` import, `USE_SQL_VIEWS`, `SQL_VIEWS`,
`HYBRID_SQL_VIEWS`, `augmentPaymentsView`, and the two branches in `buildOne`.

Verified after: dashboard counts correct, all 10 reports and 4 ledgers render (97–141 ms), the
`/p/<slug>/data` endpoint still returns 13,862 rows with its `needs.views` tables, `/management/items`
208 rows, `/management/parties` 944. No dangling reference to any deleted file remains in the runtime,
the tools or the launchers, and `references/build-and-run.md`'s tool table no longer lists them.

## What this unblocks

Step 14 of [[trailbase-migration]] was gated on "a golden-output corpus and an N-way differ must
exist before" deleting `compute/views.js`, `compute/reports.js` and `app/lib/reports.js`. With parity
waived that gate is gone, so the manifest-first refactor can proceed: `meta.json` naming the `.sql`
files directly, and the JavaScript view builders retiring behind it
([[manifest-first-architecture-gap-2026-10-02]]).

## What is deliberately NOT waived

`tools/verify-spool-reports.mjs` **stays**, and the distinction matters. It is not a parity gate — it
compares nothing to the old system. It checks the current system against itself:

- **72 bind checks** — every declared parameter is proved to reach its statement *and* to narrow it.
  A parameter that is declared but not bound arrives as NULL, `(:party = '' OR …)` is never true, and
  the report returns **zero rows** — which reads as a broken date filter rather than a missing bind.
- **13 totals compared against the column they print.** A footer that disagrees with its own body is
  wrong even by one paisa, because the footer is what an operator trusts. This caught
  `productsale`'s `printf('%.2f')` tie behaviour, which rounded half-to-seven where the money rule
  rounds half-up.
- **15 totals proven as the exact paisa sum of their own rows**, 41 more corroborated by a second
  construction.

Deleting that would remove the only thing standing between a future SQL edit and a silently wrong
report. Green after this change: 14 passed, 0 failed.

## Consequences

**Accepted**

- Report figures no longer reproduce the old system's output, and the differences will be corrected
  case by case as they are found rather than prevented up front.
- When a report is wrong there is no reference to diff against, so a bug now has to be recognised from
  the data rather than caught by comparison.

**Given up**

- The ability to answer "does the new system agree with the old one?" for any report. The old figures
  survive only as the imported ledger itself.
- `compute/views.js` (621 lines) loses its last justification as "the parity reference", so the case
  for deleting it is now purely that `counts` and `refs` should have `.sql` equivalents. That is the
  next piece of work, not this one.

## Related

- [[sql-review-2026-10-02]] — the review that found the dead path, including why the previous sweep
  could not see it.
- [[manifest-first-architecture-gap-2026-10-02]] — what the waiver makes possible.
