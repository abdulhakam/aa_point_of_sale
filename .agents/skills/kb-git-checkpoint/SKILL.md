---
name: kb-git-checkpoint
description: Use an existing Git repository as a verification and recovery layer around knowledgebase work. Use before risky edits to inspect status and diff, and after edits to catch unrelated changes, secrets, malformed generated churn, or unexpectedly large rewrites.
---

# Skill: kb-git-checkpoint

## Purpose
Use existing Git history as an additional safety/verification layer around knowledgebase work.

## Preconditions
The project/vault is already in a Git repository or the user separately authorized initialization.

## Procedure
1. Inspect status/diff before broad or destructive work.
2. Create a knowledgebase Checkpoint before the risky operation regardless of Git.
3. After edits, inspect diff for accidental unrelated changes, secrets, malformed generated churn, and large unexpected rewrites.
4. Run validation/tests.
5. Commit only if user/project policy authorizes agent commits. Use a factual message.

## Invariants
Git does not replace WorkSession/Checkpoint. Never force-reset user changes to make the diff clean.
