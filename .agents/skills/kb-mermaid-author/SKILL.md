---
name: kb-mermaid-author
description: Write or repair a single Mermaid diagram from supplied canonical facts. Use when you already have the exact nodes, edges, actors, or states and need a correct, readable fenced Mermaid block with adjacent plain-text explanation.
---

# Skill: kb-mermaid-author

## Purpose
Write or repair one Mermaid diagram from supplied canonical facts.

## Inputs
- selected diagram type
- exact nodes/actors/states/edges/events
- desired title/context

## Procedure
1. Do not invent missing edges/states/dates.
2. Use short stable node IDs and readable labels.
3. Keep labels free of fragile punctuation where possible; quote complex labels.
4. Prefer top-to-bottom or left-to-right flow based on readability.
5. Keep diagram focused; split very large diagrams.
6. Add adjacent plain-text interpretation.
7. Validate syntax as far as available tooling allows.

## Output
A fenced `mermaid` block plus 1-3 sentences explaining it.
