---
name: kb-requirement
description: Capture a durable Requirement with a stable project-local id and explicit acceptance criteria. Use when recording expected behavior or a constraint that needs traceability to implementing Tasks and verifying Tests.
---

# Skill: kb-requirement

## Purpose
Capture a durable requirement with acceptance criteria and traceability.

## Inputs
- source statement/evidence
- Project
- requirement behavior/constraint

## Procedure
1. Allocate a stable project-local `requirement_id` without renumbering existing IDs.
2. Create under `requirements/` with `type: Requirement` and Project relationship.
3. Write Requirement statement, Rationale/Source, Acceptance criteria, Out of scope if known.
4. Link Source when provenance exists.
5. Later link implementing Tasks/Artifacts with `implements` and Tests with `verifies` from those objects.

## Invariants
Do not convert guesses into requirements. Preserve original meaning when paraphrasing user/client statements.
