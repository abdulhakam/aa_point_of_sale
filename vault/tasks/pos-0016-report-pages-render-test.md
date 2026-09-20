---
type: Task
status: Ready
ticket: POS-0016
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
  - "[[Route Map]]"
affects:
  - "[[Frontend — Next.js Application]]"
blocked_by:
  - "[[POS-0015 Trim expands + adopt pagination in report pages]]"
created: 2026-09-20
updated: 2026-09-20
tags:
  - testing
  - frontend
  - reports
---

# POS-0016 Report pages render test

## Goal

Confirm each rewired report page renders the same correct data after expand-trimming,
pagination, and summary-view adoption.

## Done when

- For every page changed in [[POS-0015 Trim expands + adopt pagination in report pages]], a manual/automated pass confirms:
  - table rows match the pre-change output for a fixed filter range (spot-check totals),
  - pagination controls navigate correctly and totals still reflect the full range,
  - no `undefined`/blank cells from removed expands (names resolved via cached map or SQL).
- Any mismatch is fixed or filed as an Issue before [[POS-0018 Regression-test performance suite]].

## Related

- Test companion to [[POS-0015 Trim expands + adopt pagination in report pages]].
