---
title: The 14/14 report-parity differential can no longer be reproduced
type: issue
status: resolved
severity: high
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, parity, reports, verification, risk, views]
related_to: ["[[guest-app-host-port]]", "[[trailbase-drop-sql-views]]", "[[legacy-sql-views-differ-from-js-views]]", "[[report-parity-flakes-on-float-arithmetic]]", "[[tb-0022-move-reports-to-sql]]", "[[tb-0025-host-endpoint-hygiene]]"]
---


## RESOLVED 2026-10-01 — by deleting the thing that could not be reproduced

The differential was unreproducible because it needed `compute/reports.js`, and that file's
reproducibility was the whole problem: 577 lines of JavaScript report arithmetic that nothing tested
against the production system any more.

It is now **deleted**. The user set the direction explicitly: every calculation is performed through
SQL, and the comparison against the legacy production system happens once the migration is complete,
not continuously. So the un-reproducible differential is no longer needed, and the thing it compared
is gone.

What replaced it as a standard is absolute rather than comparative. `tools/verify-spool-reports.mjs`
is now a self-consistency gate: every page column exists in the projection, every totals key the page
reads is produced by the statement, every filter with a real value narrows the result, and each total
is **EXACT** (the integer paisa sum of the rows it reports, reduced independently in integer
arithmetic), **SOUND** (a derived total equals `{op, terms}` over the SQL's own totals at paisa
resolution) or **CORROBORATED** (a second, independently written paisa construction agrees).

`14 passed, 0 failed, 72 binds verified, 15 totals proven EXACT, 26 CORROBORATED`.

# The 14/14 report-parity differential can no longer be reproduced

## The finding

The flagship correctness result for the new system — that the guest's 14 report/ledger screens
match the legacy Next.js reports row for row — is stated as current in several places
(`notes/system-status-overview.md:19`, `notes/guest-app-host-port.md:69-71`) but there is no longer
any way to re-run it:

- **The harness is gone.** `trailbase/tools/guest-parity.mjs` was deleted with the Node
  `frontend-ssr` baseline (`notes/vault-code-drift-audit.md:27-29`,
  `notes/guest-vs-node-performance.md:18`). It needed both apps running against one TrailBase
  server; only one app exists.
- **The code has changed since.** `USE_SQL_VIEWS` was enabled in `tb-0022` (`:84-85` records
  "14/14 on three consecutive differential runs with the SQL path on"; the flag was deleted
  2026-10-02 with the legacy view layer) and then **turned back off**
  (commit `5ccebd8`, for fresh-invoice divergence — see
  [[invoice-entry-freshness-and-writes]] and
  `issues/report-parity-flakes-on-float-arithmetic.md:78`). So the path that was proven is not the
  path that ships.
- **The remaining harness only half-covers it.** `view-equivalence.mjs` (deleted 2026-10-02 with
  the legacy view layer) compares the *SQL views* to
  `compute/views.js` and reads a depot, but (a) it never ran against the legacy Next.js code and
  (b) with `USE_SQL_VIEWS = false` it is testing a path the app does not take. Its current output
  is `transactionView` / `invoiceView` / `transactionsReport` identical and `paymentsView`
  **DIFF**ering — the known [[legacy-sql-views-differ-from-js-views]] company-column divergence.
- **The depot it measured is gone.** It ran against the production-sized copy
  (8,927 invoices / 23,413 transactions / 26,526 payments). `trailbase/traildepot/data/` was
  wiped by a later `clear_db.bat` ([[tb-0024-flatten-new-system-layout]]); the surviving
  `%TEMP%\kilo\aa-perf-depot` is one migration behind the source.

## Why it matters

"14/14" is doing a lot of load-bearing work in the vault — it is the main evidence that the
migration is safe. A number nobody can regenerate is a number that decays silently: every later
change to `compute/views.js`, `compute/reports.js` or `app/lib/reports.js` is unverified with
respect to the legacy behaviour, and the vault's own wording invites exactly that assumption.

## The options

1. **Re-import and re-baseline.** Run the V1 import
   ([[pos-0029-rebuild-v1-import-on-guest]]), then compute the legacy and guest report outputs
   offline from the two databases and diff them — no second app needed, because the legacy report
   arithmetic is reproducible from `backend/p_data` with a Node script. This is the cheapest path to
   a *regenerable* gate and is close to what `extract-legacy-views.mjs` +
   `verify-legacy-views.mjs` already do for SQL (both deleted 2026-10-02 with the legacy view
   layer).
2. **Accept it as historical.** Mark 14/14 explicitly as "measured 2026-09-27, not reproducible
   since", in every doc that states it, and record the current baseline instead (the guest smoke suite
   passes in full — see [[smoke-count-is-not-a-hard-coded-number]] rather than a hard-coded figure
   + `view-equivalence` on a current depot; both harnesses deleted 2026-10-02 with the legacy
     view layer, so that baseline no longer exists — see [[legacy-parity-checks-waived]]).
3. **Re-add a differential harness** for the one path that ships, comparing the guest's 14 screens
   against a Node re-implementation of the same views. Higher cost, and it re-treads
   `guest-parity.mjs`.

Option 1 is the one worth taking; it turns a memory into a gate.

## Evidence

- `trailbase/tools/` — eight harnesses, none of which compares against the legacy app.
- `notes/vault-code-drift-audit.md:27-29` — the harness removal.
- `vault/tasks/tb-0022-move-reports-to-sql.md:84-90` — the SQL-on 14/14, then the revert.
- `trailbase/runtime/ahscripts/lib/reports.js:27` — `const USE_SQL_VIEWS = false` (line and flag both
  deleted 2026-10-02 with the legacy view layer).
- `node trailbase/tools/view-equivalence.mjs` on 2026-09-28 — `paymentsView` DIFF, the rest
  identical (tool deleted 2026-10-02 with the legacy view layer).
- `trailbase/traildepot/` — no `data/` directory.

## Related

- [[tb-0022-move-reports-to-sql]] — where the SQL path was enabled and reverted.
- [[guest-app-host-port]] — where 14/14 was established.
- [[pos-0029-rebuild-v1-import-on-guest]] — the import this option 1 depends on.
