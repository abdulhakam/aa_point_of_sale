---
name: kb-artifact-index
description: Create or update a Tolaria Artifact note for a navigation-worthy project component such as a module, service, workflow, database schema, endpoint, config file, or deliverable. Use when a significant artifact needs a durable vault record linked to its Project, Requirements, Decisions, Tasks, or Issues, without creating a note for every trivial file.
---

# Skill: kb-artifact-index

## Purpose
Represent a significant project artifact without creating one note per trivial file.

## Inputs
- artifact title/kind
- project-relative path or external identifier
- purpose/interface/ownership facts

## Procedure
1. Decide whether the artifact is navigation-worthy (core module, service, workflow, schema, endpoint, config, deliverable).
2. Create/update under `artifacts/` with `type: Artifact`.
3. Use `path:` for local project-relative path; `url:` for canonical external URL.
4. Link to Project and relevant Requirement/Decision/Task/Issue.
5. Body: Purpose, Interface/inputs/outputs, Important configuration, Validation/health, Known risks.

## Reject
Creating Artifact notes for every generated/cache/helper file.
