---
type: Task
status: Backlog
ticket: POS-0003
priority: P3
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Reports & Ledgers]]"
affects:
  - "[[Backend — PocketBase Data Service]]"
created: 2026-09-19
updated: 2026-09-19
tags:
  - testing
  - reports
---

# Add automated tests for report SQL views

## Goal

The money-math views (`invoice_view`, `transaction_view`, `transactions_report`,
`items_report`, `ledger_*`) have automated tests that lock their expected outputs.

## Done when

- A seeded test database plus assertions exist for the documented formulas in
  [[Reports & Ledgers]], and
- at least the known traps are covered: `transaction_view.profit` being cost,
  `ledger_journal.stock` being always 0, and the `recieving` spelling.

## Context

Report logic lives entirely in SQL view collections with no test harness today. This is the
highest-leverage place to prevent silent money errors.

## Work log

- 2026-09-19 — Identified during knowledgebase setup.

## Related

- [[Reports & Ledgers]], [[Backend — PocketBase Data Service]].
