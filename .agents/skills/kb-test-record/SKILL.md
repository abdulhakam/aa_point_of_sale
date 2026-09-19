---
name: kb-test-record
description: Create a repeatable verification record and link it to what it proves. Use when documenting preconditions, procedure, expected result, and actual result for a Requirement, Task, or Issue.
---

# Skill: kb-test-record

## Purpose
Create a repeatable verification record and link it to what it proves.

## Inputs
- object(s) to verify
- preconditions
- procedure
- expected result
- actual result/evidence when executed

## Procedure
1. Create/update under `tests/` with `type: Test`.
2. Add `verifies` relationship to Requirement/Task/Issue.
3. Body: Preconditions, Procedure, Expected, Actual, Evidence, Last run.
4. Mark pass/fail only from observed evidence.
5. If a failure reveals a durable problem, create/link an Issue.

## Invariants
A Task is not Done solely because a test record exists; it must have a passing/appropriate verification result.
