---
name: kb-status-transition
description: Validate a requested status change against evidence instead of changing a label mechanically. Use before setting a Task or other object to Ready, In Progress, Blocked, Done, or Cancelled to confirm its preconditions actually hold.
---

# Skill: kb-status-transition

## Purpose
Validate a requested status change against evidence instead of changing labels mechanically.

## Inputs
Object, requested status, current evidence.

## Task rules
- `Ready`: prerequisites satisfied.
- `In Progress`: active work has begun.
- `Blocked`: concrete blocker prevents progress.
- `Done`: done criteria verified.
- `Cancelled`: intentionally ended without completion.

## Procedure
1. Read object's completion criteria/dependencies.
2. Check requested status preconditions.
3. If evidence is missing, refuse the transition and state what is missing.
4. Apply status and update WorkSession/Project derived state as necessary.
