---
name: kb-worksheet
description: Create a project Worksheet as ordinary Markdown or a Tolaria spreadsheet note. Use for tabular calculation, comparison, budget, inventory, matrix, or repeated rows and columns.
---

# Skill: kb-worksheet

## Purpose
Choose and create a project Worksheet as ordinary Markdown or a Tolaria spreadsheet note.

## Use sheet mode when
The primary interaction is tabular calculation, comparison, budget, inventory, matrix, or repeated rows/columns.

## Use Markdown mode when
The worksheet is mostly prompts, narrative analysis, or a small structured checklist.

## Sheet procedure
1. Create under `worksheets/` with `type: Worksheet`.
2. Add `_display: sheet`.
3. Keep relationships/provenance in frontmatter.
4. Store grid in CSV-like body.
5. Preserve `_sheet` system metadata if present; do not casually regenerate it.
6. Test any cross-note formula syntax against installed Tolaria when compatibility matters.

## Formula guidance
Current Tolaria builds may support `=[[note]].property` and `=[[other-sheet]].B5`. Never rely on an untested formula for critical truth.

## Invariants
Canonical Project/Task/Requirement status stays on canonical objects, not only inside cells.
