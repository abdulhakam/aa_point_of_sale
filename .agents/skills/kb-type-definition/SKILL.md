---
name: kb-type-definition
description: Add a new recurring semantic type without breaking the type-to-directory invariant. Use when an entity category genuinely recurs and cannot be modeled cleanly by an existing Tolaria type.
---

# Skill: kb-type-definition

## Purpose
Add a new recurring semantic type without breaking the type-directory invariant.

## Preconditions
Existing types cannot model the entity cleanly and the category will recur.

## Procedure
1. Define singular PascalCase type name and plural directory name.
2. Create `types/<type-slug>.md` with `type: Type`, H1, description, optional Tolaria display metadata.
3. Add directory mapping to policy/config.
4. Create the directory.
5. Define minimal allowed/common frontmatter fields and relationships.
6. Update validation/routing docs and skill guidance.
7. Migrate existing objects only through an explicit migration plan.

## Invariants
Do not use a Type as a temporary tag. Avoid overlapping meanings.
