---
name: kb-reconcile
description: Repair disagreement between canonical objects and derived project views using the documented authority order. Use when a Project index, diagram, dashboard, or checkpoint contradicts Task or object frontmatter.
---

# Skill: kb-reconcile

## Purpose
Repair disagreement between canonical objects and derived project views.

## Inputs
- conflicting Project/Task/Checkpoint/diagram/view state
- actual current project/runtime evidence when relevant

## Authority order
1. Actual project/runtime/filesystem state.
2. Canonical object's own frontmatter/body facts.
3. Latest verified Checkpoint.
4. Project summary/index.
5. Derived diagrams/views/HTML dashboards.
6. Older WorkSession logs.

## Procedure
1. Identify each disagreement explicitly.
2. Update canonical object only if real-world evidence proves it stale.
3. Regenerate derived indexes/diagrams from canonical data.
4. Record material correction in WorkSession/Checkpoint.
5. Never silently rewrite historical Decision/Checkpoint records to pretend the disagreement never existed.
