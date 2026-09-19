---
type: Task
status: Done
ticket: EX-001
priority: P1
belongs_to:
  - "[[Example Project]]"
created: 2026-01-01
updated: 2026-01-01
tags:
  - example
---

# Create the vault

## Goal

A vault that passes validation and carries the generated project views.

## Done when

- The core directories and type documents exist.
- `kb.py graph` has written the task index and the progress flowchart.
- `kb.py validate` reports no errors.

## Context

This is the first executable step, so nothing blocks it.

## Work log

- 2026-01-01 — Initialized the vault and generated the derived views.

## Verification

`kb.py validate <vault>` passed with no errors after `kb.py graph` regenerated
the Project's `## Tasks` and `## Task dependency and progress` sections.
