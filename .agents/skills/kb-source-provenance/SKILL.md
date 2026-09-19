---
name: kb-source-provenance
description: Record an important Source so future agents can distinguish evidence from inference. Use for specifications, client requirements, transcripts, official documentation, or external research that drives a decision.
---

# Skill: kb-source-provenance

## Purpose
Record an important source so future agents can distinguish evidence from inference.

## Inputs
- source URL/path/title
- source kind/date/access date if known
- supported claims/objects

## Procedure
1. Create `sources/<slug>.md` with `type: Source`.
2. Store canonical `url:` or project-relative path in body/frontmatter as appropriate.
3. Summarize source factually and briefly.
4. Link relevant Requirements/Decisions/Topics/Tasks.
5. Quote only what is necessary and legally/policy permitted.
6. State uncertainty/version/date when freshness matters.

## Invariants
Do not turn an inference into a sourced fact. Do not store credentials embedded in URLs.
