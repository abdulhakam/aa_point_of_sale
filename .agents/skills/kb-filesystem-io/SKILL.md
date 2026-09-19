---
name: kb-filesystem-io
description: Safely read and edit a Tolaria vault through direct filesystem operations when Tolaria MCP is unavailable. Use for read-modify-write note edits while preserving UTF-8, newline style, atomic writes, and vault-root confinement.
---

# Skill: kb-filesystem-io

## Purpose
Safely edit a Tolaria vault when MCP is unavailable.

## Procedure
1. Resolve absolute vault root and keep writes inside it.
2. Read target immediately before modification.
3. Preserve UTF-8 and existing newline style when practical.
4. Write atomically when tooling permits: temporary sibling then replace.
5. Never overwrite an existing file during create without explicit intent.
6. Re-read the changed file and validate frontmatter/H1/links.
7. If Tolaria refresh is available through another mechanism, request it after broad changes.

## Invariants
No path traversal outside vault. No hidden side database. No destructive directory rewrite for a small note edit.
