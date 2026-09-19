---
type: Checkpoint
status: Current
belongs_to:
  - "[[Example Project]]"
work_session:
  - "[[Work Session — Example Project — 2026-01-01]]"
works_on:
  - "[[Write the first note]]"
created: 2026-01-01
updated: 2026-01-01T09:30:00Z
tags:
  - example
---

# Checkpoint — Example Project — 2026-01-01 09:00

## Objective

Leave a resume point that needs no chat history.

## Active tasks

- [[Write the first note]]

## Completed since previous checkpoint

[[Create the vault]] is Done and verified.

## Current verified state

`kb.py validate` passes. The Project task index and progress graph are synchronized
with Task frontmatter.

## Files / artifacts changed

- `projects/example-project.md`, `tasks/*`, `decisions/*`, `notes/*`
- this checkpoint and its WorkSession

## Decisions and assumptions

[[Adopt a Tolaria vault]] is Accepted; the vault is the only authoritative store.

## Blockers and unresolved questions

None.

## Exact next action

Execute [[Write the first note]]: add a `type: Note` object, link it to
[[Example Project]], then run `kb.py graph` and `kb.py validate`.

## Verification still required

The new note's backlink to the Project.

## Resume procedure

1. Read [[Example Project]].
2. Read [[Write the first note]].
3. Run `kb.py resume <vault> --project "Example Project"` to land here again.
