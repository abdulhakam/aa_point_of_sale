---
type: Note
status: Active
created: 2026-01-01
updated: 2026-01-01
belongs_to:
  - "[[Example Project]]"
related_to:
  - "[[Example Project]]"
tags:
  - knowledgebase
  - example
---

# Welcome

A general knowledge record. Notes are the catch-all type for durable information that
no narrower object describes — the same vault can hold project work and personal
reference material side by side.

## How a link works

Frontmatter wikilinks become graph edges; body wikilinks are for prose. The link to
[[Example Project]] above is structural, so this note appears in that Project's backlinks.

## Tags

`tags:` is an ordinary list valued field. `scripts/kb_check.py` reports how many distinct
tags a vault uses and which are most common, so a sprawling vocabulary is visible.
