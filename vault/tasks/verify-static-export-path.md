---
type: Task
status: Backlog
ticket: POS-0004
priority: P2
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Desktop & Deployment]]"
affects:
  - "[[Build & Run Scripts]]"
created: 2026-09-19
updated: 2026-09-19
tags:
  - build
  - tauri
---

# Verify the static export path for Tauri and RUN SERVE

## Goal

Decide and verify how Tauri (`distDir: ../out`) and `RUN SERVE.BAT`
(`http-server ./out/`) obtain the `out/` directory, or change them to match the real build.

## Done when

- `next.config.js`'s `output` setting and the `out/` consumers are consistent, and
- `backend/TAURI BUILD.BAT` and `backend/RUN SERVE.BAT` both work from a clean checkout.

## Context

`next.config.js` has `output: 'export'` commented out, while `frontend/src-tauri/tauri.conf.json`
sets `distDir: ../out` and `RUN SERVE.BAT` serves `./out/`. As-is, the static-export path is
unverified and likely broken.

## Work log

- 2026-09-19 — Identified during knowledgebase setup.

## Related

- [[Build & Run Scripts]], [[Desktop & Deployment]].
