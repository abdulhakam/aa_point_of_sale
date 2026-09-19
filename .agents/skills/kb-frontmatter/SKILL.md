---
name: kb-frontmatter
description: Create or repair YAML frontmatter while preserving Tolaria semantics. Use when writing or fixing a note's type, status, date, url, belongs_to, related_to, or wikilink relationship fields, or when normalizing malformed frontmatter.
---

# Skill: kb-frontmatter

## Purpose
Create or repair YAML frontmatter while preserving Tolaria semantics.

## Inputs
- note text
- target type
- requested structured facts

## Procedure
1. Preserve unknown user fields unless invalid or explicitly removed.
2. Ensure `type` exists and matches the intended entity.
3. Use `status`, `date`, `url`, `belongs_to`, `related_to` according to Tolaria conventions.
4. Encode relationship targets as quoted wikilinks; use arrays when cardinality may grow.
5. Preserve underscore-prefixed fields exactly unless this skill was explicitly given authority over a known system field.
6. Add/update `updated` only for agent-managed execution records/policies that use it.
7. Validate opening/closing `---`, YAML indentation, and no duplicate keys.

## Invariants
- No invented `_...` fields.
- No raw paths/plain names inside relationship fields when a canonical note exists.
- Do not add speculative metadata.

## Output
A complete frontmatter block plus a concise change summary.
