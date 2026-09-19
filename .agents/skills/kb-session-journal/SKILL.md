---
name: kb-session-journal
description: Create and maintain a durable WorkSession execution journal during agentic work. Use to record the objective, plan, activity log, changed artifacts, verification, blockers, and next action as work progresses.
---

# Skill: kb-session-journal

## Purpose
Maintain factual durable context during agentic execution.

## Inputs
- Project
- active Task(s)
- current objective
- factual updates from tools/actions

## File
`work-sessions/YYYY-MM-DD-<project>-<focus>.md`

## Required frontmatter
- `type: WorkSession`
- `status: In Progress|Paused|Completed|Interrupted`
- `belongs_to: [[Project]]`
- `works_on: [...]`
- `started`, `updated`

## Required body
Objective; Starting state; Plan; Constraints; Activity log; Changed artifacts; Verification; Blockers/open questions; Exact next action.

## Update rules
Update after atomic state changes, discoveries, blockers, plan changes, large edit batches, before risk/long external operations, and before switching Task.

## Invariants
- Factual operational state only; no private chain-of-thought.
- No secrets.
- Keep the log compact enough to scan.
