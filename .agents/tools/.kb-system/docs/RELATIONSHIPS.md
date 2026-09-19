# Relationship Model

## Tolaria-native relationships

- `belongs_to`: strong ownership/composition/context. Canonical direction is child -> parent.
- `related_to`: symmetric/lateral semantic association.
- `has`: explicit contained relationship. Do not add it merely to mirror a child's `belongs_to`; Tolaria exposes inverse relationship/backlink groups. Use `has` when the explicit containment edge is independently useful.

## Standard custom relationships

| Field | Direction | Meaning |
|---|---|---|
| `blocked_by` | Task -> Task | Hard execution dependency (`depends_on` is an accepted alias) |
| `implements` | Task/Artifact -> Requirement | Implements requirement |
| `verifies` | Test -> Requirement/Task/Issue | Provides verification |
| `affects` | Issue/Decision -> Artifact/Project/Requirement | Scope of impact |
| `supersedes` | Decision/Checkpoint -> older object | Replaces prior durable state |
| `work_session` | Checkpoint -> WorkSession | Session captured by checkpoint |
| `works_on` | WorkSession/Checkpoint -> Task | Active work target |
| `source_of` | Source -> supported object | Explicit provenance link |

## Rules

1. Relationship values are wikilinks.
2. Prefer arrays for relationships that may become plural.
3. Use the least-specific relationship that remains semantically correct.
4. Do not mirror every custom edge in both directions; backlinks provide discovery.
5. `blocked_by` (or its `depends_on` alias) should form a DAG for ordinary Task execution.
6. Use body wikilinks for explanatory prose; use frontmatter for graph-important edges.
