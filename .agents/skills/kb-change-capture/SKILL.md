---
name: kb-change-capture
description: Translate completed project work into the smallest necessary knowledgebase updates. Use after finishing a chunk of work to update Task status, Artifacts, Requirements, Issues, Tests, Decisions, the WorkSession, and the Checkpoint without creating a note per minor edit or duplicating one fact across many notes.
---

# Skill: kb-change-capture

## Purpose
Translate completed project work into the smallest necessary knowledgebase updates.

## Inputs
- factual change set
- affected Tasks/Artifacts/Requirements/Issues/Tests/Decisions

## Procedure
1. Update Task status/work log/verification if execution state changed.
2. Update/create Artifact only for navigation-worthy changed components.
3. Create Decision only if a durable choice was made.
4. Create/update Issue only if a durable problem/risk was found.
5. Update Test when verification was executed.
6. Update WorkSession and Checkpoint.
7. Reconcile Project index/graph.

## Invariants
Do not create one note per minor edit. Do not duplicate a fact into every related object.
