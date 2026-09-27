---
title: Money is 2 decimal places everywhere — stored, transported and displayed
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
tags: [money, floats, precision, reports, data-integrity]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-parity-flakes-on-float-arithmetic]]", "[[tb-0015-integer-cents-for-money]]", "[[tb-0022-move-reports-to-sql]]", "[[reports-and-ledgers]]"]
---

# Money is 2 decimal places everywhere — stored, transported and displayed

## Decision (owner, 2026-09-27)

**No money value may carry more than two decimal places at any point**: not in the database, not
in API/report payloads, not in rendered output. Insignificant digits (beyond 2) must not exist
anywhere.

Concretely:

1. **Writes** round every money field to 2 dp before insert/update, so the depot never stores a
   sub-cent amount.
2. **Report/API data** carries money already rounded to 2 dp (the JS `round2`), not raw float
   residue — `result.rows[].amount = 3987.68` and never `3987.6899999999996`.
3. **Display** formats money to 2 dp (`money` / `printf('%.2f')` in templates).
4. Existing rows with sub-cent values are **backfilled** to 2 dp (a data migration).

## Why this also fixes the flakiness

The former Node-vs-guest differential flaked on exactly this: one side emitted an **unrounded**
money value while the other emitted the rounded one ([[report-parity-flakes-on-float-arithmetic]]).
If money is rounded to 2 dp in the data on both sides, the last-bit residue cannot appear and the
comparison is stable. Expected side effect: `USE_SQL_VIEWS` can be turned on without the flake
([[tb-0022-move-reports-to-sql]]).

## Caveat to watch

Rounding **unit prices** to 2 dp changes derived totals where the current data has more precision
(e.g. a `cost_price` of `6.375` becomes `6.38`, and any total built from it shifts by a cent). The
owner has chosen this rule, so the change is intended — but the reports' numbers on the existing
depot will move (they read the same backfilled data), and the pinned totals in the smoke fixtures
only use clean 2 dp values so they are unaffected.

## Evidence

- The Node-vs-guest differential harness (`runtime-js/tools/guest-parity.mjs`, removed with the
  Node app) recorded `3987.6899999999996 vs 3987.69` on `reports/paymentsbycompany`
  ([[guest-app-host-port]]).
- `runtime-js/site/app/compute/format.js` — `round2`, `money`.
- [[tb-0015-integer-cents-for-money]] — the storage-level form of the same goal.

## Related

- [[report-parity-flakes-on-float-arithmetic]] — the flake this removes.
- [[tb-0015-integer-cents-for-money]] — cents-as-integers is a valid implementation of this rule.
- [[tb-0022-move-reports-to-sql]] — unblocked by it.
