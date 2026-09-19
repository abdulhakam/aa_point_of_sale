---
name: kb-wikilinks
description: Create stable Tolaria wikilinks and repair dangling or ambiguous links. Use when linking notes in body prose or frontmatter, or after a rename or move that could break inbound links.
---

# Skill: kb-wikilinks

## Purpose
Create stable Tolaria wikilinks and repair dangling/ambiguous links.

## Inputs
- source note
- intended target object(s)
- link purpose: body prose or structured relation

## Procedure
1. Resolve target by exact H1/filename using Tolaria search or filesystem index.
2. Prefer a stable human-readable target title/filename.
3. Put structurally important edges in frontmatter; explanatory references in body prose.
4. If multiple targets resolve to the same title, disambiguate using supported path/file naming rather than guessing.
5. Do not create a new object solely to eliminate a harmless plain-text noun.
6. After rename/move, check inbound links or use Tolaria's own rename behavior if available.

## Output
Correct wikilink(s) and any unresolved target warning.
