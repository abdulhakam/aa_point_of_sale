---
title: Report parity can flake on float last bits; SQL aggregates make it worse
type: issue
status: mitigated
severity: medium
created: 2026-09-27
updated: 2026-09-27
tags: [reports, floats, parity, differential, sql]
related_to: ["[[tb-0022-move-reports-to-sql]]", "[[convert-base-views-not-derivations]]", "[[guest-vs-node-performance]]", "[[reports-and-ledgers]]", "[[tb-0015-integer-cents-for-money]]", "[[sql-rounding-differs-from-js-round2]]", "[[money-is-2dp-everywhere]]"]
---

# Report parity can flake on float last bits; SQL aggregates make it worse

## Mitigated (2026-09-27)

Enforcing the owner's **2 dp money rule everywhere** ([[money-is-2dp-everywhere]]) removed the
flake: report row money is rounded (`round2`) in the shared `compute/reports.js`, the guest's
numeric write path rounds to 2 dp, and a backfill migration
(`U1790300100__round_money_to_2dp.sql`) rounds existing values. With money at 2 dp the last-bit
residue cannot reach the compared data.

Result, with the SQL base views **on**:

```text
guest-parity: 14/14   (three consecutive runs, stable)
guest-smoke:  71/71   (pinned totals unchanged)
management-check: all checks passed
```

`USE_SQL_VIEWS` is now **true** in `trailbase/src/runtime/app/lib/reports.js`.

## Original finding

The Node-vs-guest differential (`trailbase/src/tools/guest-parity.mjs`, exact JSON comparison) is not
perfectly deterministic. With **no SQL views in play** (the JS path, unchanged):

```text
run A: 13/14 — mismatches: ledgers/party
run B: 14/14
```

With the SQL base views switched on it was worse and also flaky:

```text
12/14 — mismatches: reports/paymentsbycompany  (row 349 amount: 3987.6899999999996 vs 3987.69)
12/14 — mismatches: reports/dailysale          (a different run)
```

## Why

Money is `REAL` ([[tb-0015-integer-cents-for-money]]). Sums over 26k rows accumulate
double-precision error, and the two sides accumulate **in different orders**:

- The JS views sum in the order the base tables were read (`ORDER BY id DESC`).
- SQLite does not guarantee the scan order feeding an aggregate, so `SUM` over a CTE can
  accumulate in a different order (and differently between runs on the same data).

Different order + doubles = a last-bit difference (~1e-12 relative), which an exact comparison
reports as a mismatch even though no cent moved.

## Consequences

- The **SQL base views are off by default** (`USE_SQL_VIEWS = false` in
  `trailbase/src/runtime/app/lib/reports.js`) until the accumulation is deterministic; the JS path is the
  parity-safe default ([[convert-base-views-not-derivations]]).
- The differential should compare money with a tiny tolerance (e.g. 1e-6 absolute, far below a
  cent) rather than exact JSON, or the reports must be bit-deterministic. The equivalence gate
  already does this (`view-equivalence.mjs` canonicalises to 6 decimals).
- The real fix is storing money as **integer cents** ([[tb-0015-integer-cents-for-money]]): integer
  sums are exact and the whole class of drift disappears.

## Evidence

- `trailbase/src/tools/guest-parity.mjs` — 13/14 then 14/14 on the same code and data.
- `trailbase/src/runtime/app/lib/reports.js` — `USE_SQL_VIEWS = false` with the reason.
- `trailbase/src/runtime/app/lib/sqlviews.js` — `ORDER BY "id" DESC` added to align order (helped but
  cannot bind an aggregate's scan order).

## Related

- [[convert-base-views-not-derivations]] — why the SQL path is base-views-only and switchable.
- [[tb-0022-move-reports-to-sql]] — the task.
- [[tb-0015-integer-cents-for-money]] — the durable fix.
