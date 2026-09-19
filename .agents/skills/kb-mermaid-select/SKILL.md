---
name: kb-mermaid-select
description: Choose the smallest correct Mermaid diagram type for a given need. Use when deciding between flowchart, sequenceDiagram, stateDiagram-v2, classDiagram, erDiagram, timeline, gantt, gitGraph, and mindmap.
---

# Skill: kb-mermaid-select

## Purpose
Choose the smallest correct Mermaid diagram type.

## Inputs
- what the diagram must explain
- whether ordering, state, cardinality, dates, or hierarchy is authoritative

## Decision tree
1. Dependency/process/branching path -> `flowchart`.
2. Ordered messages among actors/systems -> `sequenceDiagram`.
3. Finite lifecycle transitions -> `stateDiagram-v2`.
4. Static object/type structure -> `classDiagram`.
5. Relational entities/cardinality -> `erDiagram`.
6. Chronological milestone history -> `timeline`.
7. Real schedule with trusted dates/durations -> `gantt`.
8. Git branches/commits -> `gitGraph`.
9. Exploratory concept hierarchy -> `mindmap`.

## Reject
- Gantt from guessed dates.
- Mindmap for execution dependencies.
- ER diagram when no meaningful cardinality model exists.
- Sequence diagram for static topology.

## Output
Diagram type + one-sentence reason + required source facts.
