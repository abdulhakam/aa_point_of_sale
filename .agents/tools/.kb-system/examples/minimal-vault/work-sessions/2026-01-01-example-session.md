---
type: WorkSession
status: Completed
belongs_to:
  - "[[Example Project]]"
works_on:
  - "[[Create the vault]]"
created: 2026-01-01
updated: 2026-01-01
started: 2026-01-01T09:00:00Z
sequence: 1
session_key: "2026-01-01-example-project"
tags:
  - example
---

# Work Session — Example Project — 2026-01-01

## Objective

Stand up the example vault and its continuity records.

## Starting state

No vault existed.

## Plan

1. Initialize the structure.
2. Write the Project and its Tasks.
3. Generate the derived views and validate.

## Activity log

1. Initialized the vault from the kit template.
2. Wrote [[Example Project]], its Tasks, and [[Adopt a Tolaria vault]].
3. Ran `kb.py graph`, then `kb.py validate`.

## Verification performed

Validation passed; the Project's index and flowchart match the Task frontmatter.

## Blockers / open questions

None.

## Exact next action

Execute [[Write the first note]].
