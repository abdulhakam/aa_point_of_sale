---
name: knowledgebase-manager
description: Orchestrate the full lifecycle of a Tolaria-compatible project knowledgebase. Use when asked to create, maintain, resume, audit, or reorganize a project knowledgebase so that derived views stay subordinate to source objects.
---

# Skill: knowledgebase-manager

## Purpose
Orchestrate the complete lifecycle of a Tolaria-compatible project knowledgebase without making derived views more authoritative than source objects.

## Use when
The user asks to create, maintain, resume, audit, reorganize, or use a project knowledgebase.

## Required inputs
- project/vault location or enough context to discover it
- user objective
- root `AGENT.md`/`AGENTS.md` if present

## Procedure
1. Run `kb-discover-capabilities`.
2. If creation is requested and no vault exists, run `kb-initialize-vault`.
3. Identify the Project object. Create it with `kb-create-project` only when needed.
4. If continuing work, run `kb-resume` before mutating project files.
5. Normalize work into Task objects via `kb-task-lifecycle`; model hard dependencies with `kb-task-dependencies`.
6. Start/update a WorkSession using `kb-session-journal` before meaningful project mutation.
7. Route each durable fact to the narrowest relevant object type: Requirement, Decision, Issue, Test, Artifact, Source, Worksheet, Diagram, or Note.
8. After Task state/dependency changes, run `kb-progress-diagram` and reconcile the Project task index.
9. Create Checkpoints after milestones and before risky/context-heavy phases.
10. Run `kb-validate` before concluding.
11. Finish the WorkSession and final Checkpoint. The final checkpoint either states the exact next action or explicitly says there is none.

## Invariants
- Never use chat history as the only store of resumable state.
- Never invent project facts to make the knowledgebase look complete.
- Frontmatter/object state beats summaries, diagrams, and dashboards.
- Tolaria MCP is preferred when available; direct files are the fallback.
- No secrets in the vault by default.

## Output
A coherent, validated, resumable document graph with synchronized project/task state.

## Escalate when
- project identity is genuinely ambiguous and choosing wrong would cause destructive writes
- concurrent edits cannot be merged safely
- a schema/ontology change would affect many existing objects
- secret storage is requested without clear user intent
