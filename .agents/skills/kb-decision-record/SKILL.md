---
name: kb-decision-record
description: Create or update a durable project Decision with context, consequences, alternatives, and evidence. Use when a choice affects future architecture, data model, dependencies, security, deployment, or product behavior and future agents would otherwise have to rediscover why it was made.
---

# Skill: kb-decision-record

## Purpose
Create/update a durable project Decision.

## Inputs
- decision question
- chosen option/status
- concrete evidence/context
- alternatives actually considered

## Procedure
1. Reuse existing Decision if it is the same decision boundary.
2. Create under `decisions/` with `type: Decision` and `belongs_to: [[Project]]` when project-scoped.
3. Body sections: Status, Context, Decision, Consequences, Alternatives considered, Evidence, Revisit when.
4. Link affected Artifacts/Requirements/Project using `affects` when useful.
5. If superseding, link `supersedes` and preserve the old record.

## Invariants
Do not fabricate alternatives or rationale. Separate evidence from judgment.
