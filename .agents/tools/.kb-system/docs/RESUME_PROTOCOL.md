# Resumption Protocol

The system survives lost chat context by writing operational state continuously.

## Before work

1. Read Project.
2. Read latest current Checkpoint.
3. Read active Tasks.
4. Inspect changed Artifacts named by the Checkpoint.
5. Revalidate assumptions that can change externally.
6. Start or resume a WorkSession.

## During work

Write WorkSession updates after atomic state changes, discoveries, blockers, plan changes, substantial edit batches, and before/after risky or long external operations.

Create Checkpoints after milestones and before high-risk/context-heavy phases.

## Checkpoint minimum

- objective
- active Tasks
- completed since previous checkpoint
- verified current state
- changed files/artifacts
- decisions/assumptions
- blockers/open questions
- exact next action
- verification still required
- short resume procedure

## On a fresh conversation

Do not reconstruct from memory first. Read the filesystem state first, then continue from the Checkpoint only if current reality still supports it.
