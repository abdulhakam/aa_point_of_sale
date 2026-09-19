---
name: kb-task-dependencies
description: Add, remove, and validate hard Task dependencies. Use when linking a dependent Task to a prerequisite, checking the dependency graph for cycles, or reevaluating Blocked versus Ready after blockers clear.
---

# Skill: kb-task-dependencies

## Purpose
Add, remove, and validate hard Task dependencies.

## Inputs
- dependent Task
- prerequisite Task(s)

## Procedure
1. Confirm both objects are `type: Task`.
2. Confirm the dependency is hard: dependent task cannot reasonably complete first.
3. Add the prerequisite wikilink under the dependent Task's `blocked_by` (the accepted `depends_on` alias works too, and the helper reads both).
4. Search the dependency graph for a path from prerequisite back to dependent. If found, reject as a cycle.
5. Recompute status: if an unfinished hard blocker exists, `Blocked` may be appropriate; when blockers clear, reevaluate `Ready` vs `Backlog`.
6. Regenerate Project progress graph.

## Invariants
- `blocked_by` direction is dependent -> prerequisite.
- Mermaid arrow direction is prerequisite --> dependent.
- Do not encode soft ordering as a hard dependency.
