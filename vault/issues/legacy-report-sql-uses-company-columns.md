---
title: The legacy report SQL joins company columns the TrailBase schema moved to link tables
type: issue
status: mitigated
severity: medium
created: 2026-09-27
updated: 2026-09-27
tags: [reports, sql, schema-divergence, companies, trailbase, migration]
related_to: ["[[report-logic-stays-runtime-file-based]]", "[[trailbase-link-tables-over-json]]", "[[tb-0014-point-company-fields-at-companies]]", "[[guest-report-performance-options]]", "[[tb-0022-move-reports-to-sql]]"]
---

# The legacy report SQL joins company columns the TrailBase schema moved to link tables

## Mitigated (2026-09-27)

Only `payments_view` actually referenced the missing column (`order_bookers.company`); every other
failure was that view surfacing through a dependency. The extractor now applies one documented
adaptation, replacing the reference with a deterministic subquery over the link table:

```sql
(SELECT oc.company FROM order_booker_companies oc
  WHERE oc.order_booker = order_bookers.id ORDER BY oc.id LIMIT 1) AS company
```

`ORDER BY oc.id` on uuid_v7 link rows means "the first company linked", which is deterministic and
the closest single-valued equivalent of PocketBase's `company` relation. With that, **all 15 views
compose and run** (`trailbase/src/tools/verify-legacy-views.mjs`, exit 0):

```text
net_price               depot= 23414  pb= 23414
transaction_view        depot= 23413  pb= 23413
counts_for_row_numbers  depot=     1  pb=     1
payments_view           depot= 26526
ledger_journal          depot= 26614   (26,526 payments + 88 expenses)
invoice_view            depot=  8927
transactions_report     depot= 23413
payments_invoices_report depot=29984
payments_summary        depot=  2675
items_report            depot=   207
outstanding_summary     depot=     0
```

If the business ever wants a booker's *multiple* companies represented, that is a deliberate
change to the report model, not a porting detail.

## Original finding

Porting the legacy view SQL **verbatim** ([[report-logic-stays-runtime-file-based]]) ran cleanly
for the views that only touch core tables, but failed for the payment/ledger family because they
reference `order_bookers.company`:

```text
FAIL payments_view            no such column: order_bookers.company
FAIL payments_summary         no such column: order_bookers.company
FAIL payments_invoices_report no such column: order_bookers.company
FAIL ledger_journal           no such column: order_bookers.company
FAIL ledger_booker            no such column: order_bookers.company
FAIL ledger_party             no such column: order_bookers.company
FAIL outstanding_summary      no such column: order_bookers.company
```

The TrailBase schema deliberately does not carry company relation columns on `order_bookers` (or
`parties`): it uses the link tables `order_booker_companies` and `party_companies`
([[trailbase-link-tables-over-json]], [[tb-0014-point-company-fields-at-companies]]). PocketBase
had a `company` field on the row; the rewrite moved it to a link table.

## Evidence

- `trailbase/src/tools/verify-legacy-views.mjs` — 15/15 composed and ran (exit 0).
- `trailbase/src/tools/extract-legacy-views.mjs` — the `ADAPTATIONS` map carrying the one change.
- `trailbase/src/migrations/main/U1790208000__create_base_tables.sql` — `order_bookers` has
  no `company` column; `order_booker_companies`/`party_companies` exist instead.

## Related

- [[report-logic-stays-runtime-file-based]] — the porting approach this constrains.
- [[tb-0022-move-reports-to-sql]] — the task.
- [[guest-report-performance-options]] — the reason for moving to SQL.


## What happens

Porting the legacy view SQL **verbatim** ([[report-logic-stays-runtime-file-based]]) runs cleanly
for the views that only touch core tables, but fails for the payment/ledger family because they
reference `order_bookers.company`:

```text
FAIL payments_view            no such column: order_bookers.company
FAIL payments_summary         no such column: order_bookers.company
FAIL payments_invoices_report no such column: order_bookers.company
FAIL ledger_journal           no such column: order_bookers.company
FAIL ledger_booker            no such column: order_bookers.company
FAIL ledger_party             no such column: order_bookers.company
FAIL outstanding_summary      no such column: order_bookers.company
```

The TrailBase schema deliberately does not carry company relation columns on `order_bookers` (or
`parties`): it uses the link tables `order_booker_companies` and `party_companies`
([[trailbase-link-tables-over-json]], [[tb-0014-point-company-fields-at-companies]]). PocketBase
had a `company` field on the row; the rewrite moved it to a link table.

Verified with `trailbase/src/tools/verify-legacy-views.mjs` (composes each ported view, inlines its
dependencies as CTEs, and runs it against the TrailBase depot):

```text
ok   net_price               depot= 23414  pb= 23414
ok   transaction_view        depot= 23413  pb= 23413
ok   invoice_view            depot=  8927  pb=  n/a
ok   items_report            depot=   207  pb=  n/a
ok   transactions_report     depot= 23413  pb=  n/a
ok   counts_for_row_numbers  depot=     1  pb=     1
ok   items_difference_report depot=   207  pb=  n/a
FAIL (8) order_bookers.company   + ledger_area: "near WITH" (composition bug, see below)
```

## Impact

- The payment/ledger/outstanding views cannot be ported **verbatim**; those specific joins must be
  adapted to the link tables. This is a known, intentional schema divergence, not a data defect.
- The adaptation must preserve the semantics: PocketBase's `company` relation was single-valued on
  the row; the link table is many-to-many. The legacy reports treat company as one value
  (`GROUP BY company`), so the port has to decide how to collapse multiple links (e.g. the first /
  all joined names).

## Mitigation

- Adapt the company joins in the ported SQL (documented per view), replacing
  `LEFT JOIN companies c ON order_bookers.company = c.id` with a join through
  `order_booker_companies` (and `party_companies` for party company).
- Or provide a compatibility layer — a runtime `order_bookers_with_company.sql` view in `app/`
  that exposes a single `company` per booker — so the ported views stay closer to verbatim.
- Either way it is a runtime `.sql` edit, not a component rebuild or a migration.

## Also found (trivial)

`ledger_area` fails with `near "WITH"`: its own SQL already begins with `WITH`, so the composer
must merge CTEs instead of prefixing a second `WITH`. A composer fix, not a SQL problem.

## Evidence

- `trailbase/src/tools/verify-legacy-views.mjs` output above.
- `trailbase/src/migrations/main/U1790208000__create_base_tables.sql` — `order_bookers` has
  no `company` column; `order_booker_companies`/`party_companies` exist instead.
- [[trailbase-link-tables-over-json]], [[tb-0014-point-company-fields-at-companies]].

## Related

- [[report-logic-stays-runtime-file-based]] — the porting approach this constrains.
- [[guest-report-performance-options]] — the reason for moving to SQL.
