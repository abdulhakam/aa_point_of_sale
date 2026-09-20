---
type: Task
status: Ready
ticket: POS-0001
priority: P1
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Issue — Standalone Build Drift]]"
affects:
  - "[[Desktop & Deployment]]"
created: 2026-09-19
updated: 2026-09-20
tags:
  - build
  - deployment
---

# Reconcile the standalone build with source

## Goal

`standalone/` is a faithful build of the current `frontend/` source, or it is removed and
`RUN MINI.BAT` no longer depends on a stale artifact.

## Done when

- `standalone/` is regenerated from this checkout (or deliberately deleted), and
- `RUN MINI.BAT` serves a build consistent with `frontend/`, and
- the extra-report-page discrepancy in [[Issue — Standalone Build Drift]] is resolved or
  explicitly re-decided.

## Context

`standalone/.next` currently exposes 18 report routes (`dailysale`, `outstanding`,
`productsale` extra) versus 15 in the source, carries a different BUILD_ID, and was built
from a different checkout path. See [[Issue — Standalone Build Drift]].

## Work log

- 2026-09-19 — Issue recorded during knowledgebase setup; no build attempted yet.
- 2026-09-20 — The third done-criterion (extra-report discrepancy) is **resolved**: the source
  now contains `dailysale`, `outstanding`, and `productsale` (added by `261a56c`), the reports
  hub links them, and the source build emits 18 report routes like `standalone/`. See the
  Update on [[Issue — Standalone Build Drift]]. Remaining for this task is only the artifact
  drift: regenerate or remove `standalone/` and make `RUN MINI.BAT` consistent.

## Related

- [[Issue — Standalone Build Drift]], [[Build & Run Scripts]].
