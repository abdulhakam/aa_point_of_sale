---
type: Note
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Route Map]]"
  - "[[Data Model]]"
  - "[[Reports & Ledgers]]"
tags:
  - knowledgebase
  - meta
---

# Knowledgebase Guide

How this vault is organized, how to answer questions from it, and how to keep it current.

## Where to start

- [[AA Point of Sale]] — the Project: outcome, scope, current state, and index of everything.
- New here? Read the Project, then the three subsystems, then the references you need.

## What lives where

- `subsystems/` — the three bounded parts: [[Frontend — Next.js Application]],
  [[Backend — PocketBase Data Service]], [[Desktop & Deployment]].
- `references/` — lookup material: [[Route Map]], [[Data Model]], [[Reports & Ledgers]],
  [[Build & Run Scripts]], [[Glossary]].
- `decisions/` — why the stack and deployment shape are what they are.
- `issues/` — known problems, e.g. [[Issue — Standalone Build Drift]].
- `tasks/` — actionable work with dependencies.
- `work-sessions/` and `checkpoints/` — execution continuity so a new session can resume.

## Answering common questions

- "What does screen X do / what's its URL?" → [[Route Map]].
- "What fields does collection X have / how are they related?" → [[Data Model]].
- "How is total / profit / stock / a ledger computed?" → [[Reports & Ledgers]].
- "How do I install / run / build / update?" → [[Build & Run Scripts]].
- "What does term X mean?" → [[Glossary]].
- "Why PocketBase? Why local-only?" → the two Decisions.

## Keeping it current

1. When code changes schema, reports, routes, or scripts, update the matching reference in
   the same change — references are canonical summaries, not snapshots.
2. Record durable choices as Decisions and problems as Issues; put the actual work in Tasks.
3. After task changes run `python .agents/tools/kb-tools/kb.py graph vault projects/aa-point-of-sale.md`
   to regenerate the Project's task index and flowchart.
4. Validate: `python .agents/tools/kb-tools/kb.py validate vault` and
   `python scripts/kb_check.py vault`.
5. Write or refresh a Checkpoint before pausing so the next session resumes without chat history.

## Contracts

The vault follows the project-root `AGENT.md` contract. Rules of thumb: one Markdown file per
object, `type:` must match its directory, relationships are wikilinks, Task frontmatter is
canonical, and derived views (Project index/graph) are regenerated.

## Related

- Root contract: `AGENT.md` (project root).
- Skill routing: `.agents/skills/README.md`.
