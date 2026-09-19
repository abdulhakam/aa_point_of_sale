---
name: kb-html-block
description: Create a Tolaria sandboxed HTML presentation block without moving canonical truth into presentation code. Use for compact dashboards, report fragments, or custom visual summaries that read from frontmatter, Markdown, or sheets.
---

# Skill: kb-html-block

## Purpose
Create a Tolaria sandboxed HTML presentation block without moving canonical truth into presentation code.

## Inputs
- note receiving block
- data/properties it should display
- desired visual purpose

## Good uses
Dashboard, report fragment, compact status panel, custom local visualization.

## Procedure
1. Keep source data in frontmatter/Markdown/sheets.
2. Use fenced `html` source for presentation.
3. Prefer simple self-contained HTML/CSS and stable `{{...}}` vault expressions.
4. Avoid remote resources/dependencies.
5. Add a plain-text summary adjacent to the block.
6. Document referenced external notes/properties if non-obvious.

## Reject
- storing the only copy of a task status inside HTML
- hiding required operational context from text-only/small models
- unsafe/remote script dependencies
