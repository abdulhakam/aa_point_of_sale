---
name: kb-diagram-note
description: Create a standalone Diagram note when a diagram is too large or important to live only inline. Use when a Mermaid diagram needs its own durable vault object with a textual explanation and provenance.
---

# Skill: kb-diagram-note

## Purpose
Create a standalone Diagram object when a diagram is too important/large for an inline-only representation.

## Inputs
Project/topic relationship, diagram purpose, canonical source objects.

## Procedure
1. Choose type using `kb-mermaid-select`.
2. Create `diagrams/<slug>.md` with `type: Diagram` and relationships.
3. Explain purpose, source-of-truth objects, and omissions.
4. Author diagram via `kb-mermaid-author`.
5. Link the Diagram from Project/Decision/Artifact as appropriate.

## Invariants
Diagram is derived unless explicitly declared as the design source; even then, textual constraints must accompany it.
