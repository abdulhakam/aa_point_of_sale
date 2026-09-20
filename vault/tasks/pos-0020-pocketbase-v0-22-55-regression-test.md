---
type: Task
status: Done
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

## Work log

- 2026-09-20 — Wrote `scripts/tests/test_upgrade_smoke.py` (auth + a CRUD round-trip that
  cleans up after itself + every view collection) and ran it against the upgraded server.

## Verification

PASS on PocketBase 0.22.55:

- **login** — `users/auth-with-password` → token (207 chars); admin auth also OK.
- **CRUD round-trip** — create → read → update → delete on `areas`, then confirmed 404
  (the disposable record is removed).
- **every view collection returns rows** (15/15): invoice_view 8,927 · transaction_view 23,413 ·
  transactions_report 23,413 · payments_view 26,526 · payments_invoices_report 33,556 ·
  ledger_party 26,526 · ledger_booker 26,526 · ledger_area 924 · ledger_journal 26,614 ·
  items_report 207 · items_difference_report 207 · net_price 207 · counts_for_row_numbers 1 ·
  payments_summary 23,790 · outstanding_summary 602.
  (`net_price` is **admin-only** and not used by any page — read as admin here.)
- **the app boots and pages load** — headless-browser check: `/app/dashboard`,
  `/app/reports/payments` and `/app/invoices/sale` all render with no client error.
- The whole POS-0018 suite (`run_all.py`) also stays **7/7 PASS** on the new server.
