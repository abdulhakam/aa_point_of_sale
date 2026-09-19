---
name: kb-issue
description: Capture a defect, risk, inconsistency, or investigation as an Issue separate from the work that resolves it. Use when recording an observed problem together with its evidence, impact, and affected Project or Artifacts.
---

# Skill: kb-issue

## Purpose
Capture a defect, risk, inconsistency, or investigation separately from the work used to resolve it.

## Inputs
- observed problem/risk
- evidence/reproduction if available
- affected Project/Artifacts

## Procedure
1. Create/update under `issues/` with `type: Issue`.
2. Set truthful status such as Open, Investigating, Resolved, Accepted, Closed if local policy uses them.
3. Write Observation, Impact, Evidence/Reproduction, Unknowns, Resolution when known.
4. Use `affects` relationships.
5. Create a Task separately if work is needed.

## Invariants
Do not mark Resolved without verification. Do not collapse the problem statement into a to-do.
