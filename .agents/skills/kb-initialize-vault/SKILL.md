---
name: kb-initialize-vault
description: Initialize the standard type-partitioned Tolaria vault layout without overwriting existing content. Use when creating a new knowledgebase, or when adding missing type directories and type documents to an existing vault.
---

# Skill: kb-initialize-vault

## Purpose
Create the standard type-partitioned Tolaria vault without overwriting existing content.

## Inputs
- target vault directory
- project title if known

## Allowed writes
Only missing directories/files under the target vault unless explicit migration is requested.

## Procedure
1. Inspect the target. If non-empty, classify existing vault vs unrelated folder.
2. Create only the directories for types the vault will actually use — at minimum `types/`, plus the core set in `AGENT.md` section 4 that the work truly needs. Do not pre-create directories for unused types.
3. Create a type document under `types/` for exactly those types, and only when the vault has (or is immediately about to create) a real object of that type.
4. Ensure root `AGENTS.md` points to the canonical project contract.
5. Create `views/` and `attachments/`.
6. If project title is supplied, call `kb-create-project` rather than embedding project-specific facts here.
7. Run `kb-validate`.

## Invariants
- Never flatten/reorganize existing user files during initialization.
- Never initialize Git unless separately authorized.
- Never overwrite type documents containing user customizations.

## Output
Initialized vault plus validation result.
