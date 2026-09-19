---
name: kb-validate
description: Check Tolaria document-graph invariants before concluding work. Use to confirm frontmatter validity, type-to-directory match, resolvable wikilinks, absence of dependency cycles, synchronized Project indexes, and Done-task verification.
---

# Skill: kb-validate

## Purpose
Check document-graph invariants before concluding work.

## Checks
- managed Markdown has frontmatter and first H1
- `type:` matches canonical directory
- managed type has a type document
- relationship wikilinks resolve or are explicitly external/unresolved
- no Task dependency cycles (`blocked_by`, or its accepted `depends_on` alias)
- each Task belongs to a Project when project-scoped
- each Project derived task index matches Task membership/status
- Project Mermaid dependency edges match the Task dependency fields
- active work has sufficient WorkSession/Checkpoint context
- Done Tasks have verification section/evidence
- no obvious secret patterns are newly introduced

## Procedure
Use `.agents/tools/kb-tools/kb.py validate <vault>`, then supplement checks it cannot semantically prove. `scripts/kb_check.py` runs the same structural gate and additionally reports knowledgebase state: object counts by type, relation edges, tag usage, orphans, and an overall quality summary.

## Output
PASS or a finite list of actionable violations. Never call a vault healthy while known violations remain undocumented.
