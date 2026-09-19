---
name: kb-checkpoint
description: Write a compact resumable Checkpoint snapshot so a fresh session can continue without chat history. Use after milestones, before risky or context-heavy work, and at session end to record the objective, active tasks, verified state, changed files, blockers, and the exact next action.
---

# Skill: kb-checkpoint

## Purpose
Write a compact state snapshot that lets a fresh session resume safely.

## Inputs
- Project
- WorkSession
- active Task(s)
- verified completed work
- changed files/artifacts
- blockers/assumptions
- exact next action

## File
`checkpoints/YYYY-MM-DD-HHMM-<project>-<focus>.md`

## Procedure
1. Create a new Checkpoint; do not rewrite old history as if it never happened.
2. Link Project via `belongs_to`, session via `work_session`, tasks via `works_on`.
3. If replacing a previous current checkpoint, use `supersedes` and mark older checkpoint `Superseded` when safe.
4. Write required sections from `AGENT.md`.
5. Ensure `Exact next action` is executable, not vague (e.g. “Run X test on Y endpoint”, not “continue testing”).
6. Update Project `Current checkpoint` link.

## Invariants
- Snapshot state, not transcript.
- Claims marked verified only if evidence exists.
- Uncertainty is explicit.
