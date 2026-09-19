---
name: kb-progress-diagram
description: Regenerate a Project's derived Task index and Mermaid dependency/progress graph from Task documents. Use after Task status or dependency changes so the Project's Tasks section and flowchart agree with Task frontmatter.
---

# Skill: kb-progress-diagram

## Purpose
Regenerate a Project's canonical derived Task index and Mermaid dependency/progress graph from Task documents.

## Inputs
- Project
- all Task files whose `belongs_to` includes that Project

## Procedure
1. Read Task title, status, and dependency links from `blocked_by` (or its accepted `depends_on` alias).
2. Sort Task index predictably: active first, then backlog/done, or preserve an explicit project ordering if one exists.
3. Render checkboxes: Done/Cancelled are checked only if local policy treats Cancelled as closed; label status explicitly regardless.
4. Render a top-to-bottom `flowchart TD`; one Mermaid node per material Task, with node labels carrying the Task identifier (`ticket`), title, and status.
5. For each `B blocked_by A`, render `A --> B`.
6. If graph is too large, render the current milestone subset and create/update a standalone Diagram for the full graph.
7. Replace only the Project `## Tasks` and `## Task dependency and progress` derived sections.
8. Add text stating Task frontmatter is authoritative.

## Validation
Every edge corresponds to a real dependency field; every indexed Task belongs to Project; no missing material Task.
