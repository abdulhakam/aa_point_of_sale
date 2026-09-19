---
name: kb-mcp-io
description: Perform Tolaria MCP note I/O with conflict-safe semantics using vault context, search, read, create, update, and append operations. Use when Tolaria MCP tools are available and notes must be read or modified through them.
---

# Skill: kb-mcp-io

## Purpose
Perform Tolaria MCP note I/O with conflict-safe semantics.

## Preconditions
Tolaria MCP tools are actually available.

## Procedure
1. Resolve vault with `vault_context`/`list_vaults` when needed.
2. Search/read target before update.
3. For new notes use `create_note`; never depend on overwrite behavior.
4. For edits use `get_note` then `update_note` with `expectedMtime` if exposed.
5. Use `append_to_note` only when verbatim append semantics are correct (e.g. activity log); otherwise full read-modify-write.
6. After external/direct filesystem changes, call `refresh_vault` when useful.
7. If mtime guard fails, re-read and merge; never brute-force overwrite.

## Output
Changed path plus verified post-write state.
