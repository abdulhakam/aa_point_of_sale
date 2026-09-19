---
name: kb-create-project
description: Create a normalized Tolaria Project note and its initial Task system. Use when starting a new time-bounded project that needs an outcome statement, success criteria, a derived task index, and a Mermaid progress graph.
---

# Skill: kb-create-project

## Purpose
Create a normalized Project object and its initial task system.

## Inputs
- project title
- known outcome/scope/success criteria
- known work items and evidence

## Procedure
1. Create `projects/<slug>.md` with `type: Project` and truthful initial status.
2. Write Outcome, Scope (if known), Success criteria, Current state.
3. Convert actionable units into Task files using `kb-task-lifecycle`.
4. Add only verified hard dependencies with `kb-task-dependencies`.
5. Populate the Project `## Tasks` derived index.
6. Generate a `flowchart` using `kb-progress-diagram`.
7. Link known Requirements/Decisions/Issues rather than embedding them as unstructured duplicates.
8. Validate.

## Invariants
- Do not fabricate dates, owners, estimates, requirements, or dependencies.
- Task files, not project checkboxes, own task status.

## Output
Project note plus linked Task set and synchronized graph.
