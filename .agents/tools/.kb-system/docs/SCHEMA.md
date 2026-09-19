# Vault Schema

This kit uses Tolaria's Markdown/YAML/wikilink model with a stricter physical partition: each managed semantic type has one canonical directory.

## Object model

| Type | Directory | Canonical purpose |
|---|---|---|
| Type | `types/` | Type document / display-template metadata |
| Project | `projects/` | Bounded outcome-oriented effort |
| Operation | `operations/` | Repeatable workflow |
| Responsibility | `responsibilities/` | Long-running accountability |
| Task | `tasks/` | One-off actionable work item |
| Event | `events/` | Time-bound occurrence |
| Note | `notes/` | General knowledge record |
| Topic | `topics/` | Subject/concept |
| Person | `people/` | Person record |
| Decision | `decisions/` | Durable choice and rationale |
| Requirement | `requirements/` | Expected behavior / constraint |
| Issue | `issues/` | Defect/risk/problem/investigation |
| Test | `tests/` | Verification scenario/result |
| Artifact | `artifacts/` | Significant file/service/workflow/output |
| WorkSession | `work-sessions/` | Agent execution journal |
| Checkpoint | `checkpoints/` | Resumable state snapshot |
| Worksheet | `worksheets/` | Structured analysis or sheet |
| Diagram | `diagrams/` | Standalone diagram + explanation |
| Source | `sources/` | Provenance/evidence record |

### Vault-declared extension types

A vault may declare additional recurring types through the extension procedure in `AGENT.md` section 4. The six below are the optional extensions this kit's base schema names:

| Type | Directory | Canonical purpose |
|---|---|---|
| Reference | `references/` | Indexes, maps, glossaries, catalogs, cross-cutting reference material |
| Subsystem | `subsystems/` | Bounded technical/product subsystem with responsibilities and interfaces |
| Procedure | `procedures/` | Repeatable engineering/validation/recovery/maintenance workflow |
| Milestone | `milestones/` | Roadmap phase, gate, or delivery sequencing unit |
| Status Report | `status-reports/` | Point-in-time implementation status and drift observation |
| Risk | `risks/` | Known technical/product risk, failure boundary, or mitigation |

Each extension type needs a `type: Type` document under `types/`, an entry in `kb-config.json`, and at least one real object. Create them at the moment the first object is written; never pre-create an empty directory or a type document for a type the vault does not use.

The kit's template materializes only the core subset (`types/`, `projects/`, `tasks/`, `notes/`, `decisions/`, `work-sessions/`, `checkpoints/`). The other type→directory mappings stay in `kb-config.json` as a registry to route into once a real object appears — a mapping is not a directory.

`views/` and `attachments/` are special Tolaria-compatible folders rather than semantic types.

## Core frontmatter

```yaml
---
type: Task
status: Ready
created: 2026-09-17
updated: 2026-09-17T19:25:00+05:00
belongs_to:
  - "[[Project Alpha]]"
related_to:
  - "[[Topic Alpha]]"
---
```

Tolaria treats `type`, `status`, `url`, `date`, `belongs_to`, `has`, and `related_to` as conventional fields. Fields beginning with `_` are system-oriented; do not invent underscore-prefixed fields.

## Canonical-vs-derived rule

Canonical objects own their own state. Project task indexes, Mermaid graphs, dashboards, and views are derived. If they disagree with Task/frontmatter data, regenerate the derived layer.
