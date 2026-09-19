---
name: kb-route-type-directory
description: Map an entity's type frontmatter field to its one allowed directory. Use when deciding where a note belongs, or when an existing note's location violates the type-to-directory invariant.
---

# Skill: kb-route-type-directory

## Purpose
Map an entity `type:` to its one allowed directory.

## Inputs
- entity type
- optional current path

## Mapping
Use the canonical map in `AGENT.md`/`kb-config.json`.

## Procedure
1. Read `type:` exactly; do not infer it from current folder.
2. Resolve the canonical directory.
3. If type is unknown, do not invent a folder. Escalate to schema extension.
4. If the current path violates the map, report the proposed move and backlink risk before changing it.

## Output
Canonical target directory and whether a move is required.
