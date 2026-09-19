---
type: Decision
status: Accepted
belongs_to:
  - "[[Example Project]]"
created: 2026-01-01
updated: 2026-01-01
tags:
  - example
---

# Adopt a Tolaria vault

## Status

Accepted

## Context

Project state was spread across chat history and a separate board file, so a resumed
session had to rediscover what was done and why.

## Decision

Keep all durable project state in a filesystem-backed Markdown vault: one file per
object, structured facts in YAML frontmatter, relationships as wikilinks, and derived
views regenerated from the canonical objects.

## Consequences

- A fresh session can resume from the latest Checkpoint plus the active Task files.
- Summaries and diagrams are reproducible, so they cannot silently drift.
- The vault must be kept current while work happens, not written up afterwards.

## Alternatives considered

A conventional issue tracker: rejected because it would be a second authoritative store
that the agent could not read or diff from the filesystem.

## Evidence

Both `kb.py validate` and `scripts/kb_check.py` pass over this example.

## Revisit when

The object types stop matching how work is actually tracked.
