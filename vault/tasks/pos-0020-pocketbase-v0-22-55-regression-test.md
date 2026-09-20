---
type: Task
status: Ready
ticket: POS-0020
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - pocketbase
  - upgrade
  - regression
---

# POS-0020 PocketBase v0.22.55 regression test

## Goal

Confirm the drop-in server upgrade didn't break auth, CRUD, views, or reports.

## Done when

- Smoke checks pass on the upgraded server:
  - login (`pb.collection('users').authWithPassword`) works,
  - a base-collection CRUD round-trip works,
  - every view collection returns rows (`invoice_view`, `transaction_view`,
    `transactions_report`, `payments_view`, `payments_invoices_report`, `ledger_party`,
    `ledger_booker`, `ledger_area`, `ledger_journal`, `items_report`,
    `items_difference_report`, `net_price`, `counts_for_row_numbers`),
  - the app boots (`RUN.BAT`) and the dashboard + one report + one invoice page load.
- All green → the upgrade is kept; any failure → restore from
  [[POS-0006 Backup database and repo snapshot]] backup and file an Issue.

## Related

- Test companion to [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]].
