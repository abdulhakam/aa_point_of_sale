---
name: kb-task-lifecycle
description: Create or update a single Task as a verifiable unit of work. Use when adding a task to a project, setting its status, writing its goal and done-when criteria, or recording verification evidence.
---

# Skill: kb-task-lifecycle

## Purpose
Create or update one Task as a verifiable unit of project work.

## Inputs
- Project link
- task goal
- done criteria
- current evidence/state

## Status transitions
`Backlog -> Ready -> In Progress -> Done` is common, but `Blocked` may occur when a hard blocker exists and `Cancelled` ends work intentionally.

## Procedure
1. Reuse an existing matching Task when it represents the same unit of work.
2. Ensure path is `tasks/<project-slug>-<task-slug>.md`.
3. Set `type: Task`, `belongs_to`, and truthful status.
4. Write one observable Goal and explicit Done when criteria.
5. Add concise Context only when execution needs it.
6. Append factual Work log entries only when useful.
7. Mark Done only after verification; record verification evidence in body.
8. Trigger Project task-index/graph reconciliation.

## Invariants
- Issue != Task. Requirement != Task.
- No Done without verification.
- No Blocked without a concrete blocker.
