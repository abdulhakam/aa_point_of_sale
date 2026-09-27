---
title: TB-0015 Move money from REAL to integer cents
type: task
status: todo
priority: medium
created: 2026-09-26
tags: [schema, money, floating-point, trailbase, correctness]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-pocketbase-data-compatibility]]", "[[data-model]]"]
---

# TB-0015 Move money from REAL to integer cents

Every monetary column in the TrailBase schema is `REAL`, inherited from PocketBase. Change them to
`INTEGER` cents while the database is still empty.

## Why

`trailbase/README.md`, § *Follow-ups* item 4:

> Consider integer cents instead of `REAL` for money. `REAL` was kept for PocketBase compatibility,
> but every amount in the old views was wrapped in `printf("%.2f")` to hide binary float drift.
> Moving prices and amounts to `INTEGER` cents is both more correct and faster, and is a mechanical
> change while the database is still empty.

The `printf("%.2f")` detail is the evidence: the old SQL did not use it for presentation, it used it
to *hide* accumulated error. Reproducing the old arithmetic in JavaScript
([[reports-and-ledgers]]) means the same drift is now reproduced in JavaScript too — for example
`lineTotal = price × qty × (1 − d1/100) × (1 − d2/100) − discount_rs`, then
`round2(lineTotal × (1 − inv_d1/100) × (1 − inv_d2/100))`. Two `round2` calls in that chain are
load-bearing, and any missing one produces cents that differ from the old report by a rounding step.

## Columns in scope

| Table | Columns |
|---|---|
| `items` | `cost_price`, `sale_price`, `box_size_qty` |
| `expenses` | `amount` |
| `invoices` | `invoiceNo`* , `discount_1`, `discount_2`, `discount_rs` |
| `transactions` | `cost_price`, `price`, `qty`, `scheme`, `discount_1`, `discount_2`, `discount_rs` |
| `payments` | `amount` |

*`invoiceNo` is `REAL` purely for PocketBase compatibility and is an identifier, not an amount — it
probably should be `INTEGER` rather than cents. Decide that separately.

Note `qty`, `scheme` and `box_size_qty` are quantities, not money. `qty`/`scheme` are `REAL` because
a quantity can be fractional; they are listed because they participate in the arithmetic and need an
explicit decision on precision (thousandths?) if the money columns move.

Discounts are percentages (`discount_1`, `discount_2`), so they are not cents either. The obvious
representation is basis points (1/100th of a percent) — but they could also stay `REAL`, since they
are multiplied into integers rather than summed.

## Why now rather than later

- **The new database is empty.** After [[pos-0027-migrate-production-data-to-trailbase]] it is not,
  and the change becomes a data migration over real rows plus a reconciliation.
- **There is one migration file.** A change now is a new migration against a scaffold; a change
  later is a schema change against live data with the checksum hazard attached
  ([[trailbase-stale-depot-skips-migration]]).
- **The parity oracle is available.** The old view SQL is preserved and the smoke test pins six
  hand-computed amounts ([[reports-and-ledgers]]), so a cents rewrite can be checked against real
  expected values rather than against itself.

## Subtasks

- [ ] Decide the unit convention: cents (`INTEGER`, ×100) and document it in `data-model`
- [ ] Decide how percentages are stored: basis points as `INTEGER`, or `REAL` kept — and say why
- [ ] Decide the precision of `qty` / `scheme` / `box_size_qty` (fractional: 0.5 cartons are real)
- [ ] Decide `invoiceNo`: `INTEGER` rather than cents
- [ ] Write a **new** migration converting every column (a scaffold-era change; keep the applied one
      untouched)
- [ ] Update `runtime-js/site/app/compute/views.js` and `runtime-js/site/app/compute/reports.js`
      so the arithmetic works in integer units, and keep the `round2` boundaries in the same places
- [ ] Update `runtime-js/site/app/lib/management.js` and `frontend/src/app/api/items.ts` field
      metadata
- [ ] Re-run the guest smoke suite (`node runtime-js/tools/guest-smoke.mjs`) and confirm all 71
      checks still pass, including the six pinned amounts
      (`91.00`, `731.00`, `4510.00`, `800.00`/`150.00`, `150.00`, `403.85`/`161.54`)
- [ ] Update [[data-model]] and explain the unit in the conventions section

## Risk if skipped

It is not a correctness bug today — the old views hid the drift and the new engine reproduces the
same hiding. But it is a correctness bug *waiting*: any new arithmetic that forgets a `round2`, any
`SUM` over many lines, and any comparison between two computed totals can diverge by a cent. And the
`REAL` columns will be carried into the production dataset, making the fix progressively more
expensive.

## Related

- [[trailbase-pocketbase-data-compatibility]] — the decision that kept `REAL`, and its acknowledgement
  that this is debt rather than a preference.
- [[reports-and-ledgers]] — the arithmetic that must keep matching.
- [[data-model]] — the columns and the conventions section to update.
