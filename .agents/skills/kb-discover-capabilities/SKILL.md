---
name: kb-discover-capabilities
description: Detect which vault I/O path is available, choosing between Tolaria MCP, direct filesystem access, and read-only mode. Use at the start of a knowledgebase task to select the safest write mechanism and to detect Git and concurrency-guard support.
---

# Skill: kb-discover-capabilities

## Purpose
Choose the safest available vault I/O path.

## Inputs
- available tool list
- optional known vault path

## Procedure
1. Detect Tolaria MCP capabilities. Look for `vault_context`/`get_vault_context`, `list_vaults`, `search_notes`, `get_note`/`read_note`, `create_note`, `update_note`, `append_to_note`, `refresh_vault`.
2. If available, call vault context/listing to identify active vault(s) and root instructions.
3. If Tolaria MCP is unavailable, verify direct filesystem read/write access to the intended root.
4. Detect Git separately; Git availability does not determine note I/O.
5. Return one mode: `tolaria-mcp`, `filesystem`, or `read-only`.

## Invariants
- Do not assume a mentioned tool exists.
- Do not register/install MCP silently.
- Do not select an active vault by name guessing when multiple candidates exist.

## Output
A short capability record: mode, vault root(s), concurrency guard availability, Git availability.
