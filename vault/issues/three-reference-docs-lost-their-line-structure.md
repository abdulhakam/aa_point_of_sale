---
title: Three vault references have lost their line structure
type: issue
status: verified
created: 2026-09-30
tags: [vault, tooling, defect]
belongs_to: "[[vault-guide]]"
related_to: ["[[a-base64-alphabet-error-is-silent]]"]
---

# Three vault references have lost their line structure

## Symptom

Three vault documents have been written with their entire content collapsed onto a **single line**,
so their YAML frontmatter is not parsed at all:

- `vault/references/build-and-run.md`
- `vault/references/environment.md`
- `vault/systems/runtime-js-guest-platform.md`

`check.mjs` reports `FRONTMATTER_MISSING` for each, and `stats.mjs` cannot count their fields, tags
or words. The documents still *read* correctly in a viewer, because a Markdown renderer does not
care that the line breaks are gone — which is precisely why this can go unnoticed.

## Cause

Not yet established. The content reads as a correct document that was written without newlines —
consistent with a tool that read the file, transformed it, and wrote it back as a single string
(a `.replace()` over the whole buffer, or a `Set-Content` of one joined line), rather than a
deliberate author. The two independent occurrences of this in this session's history —
`route.ts` losing its structure to a blanket `-replace` earlier, and these three files — share the
shape "a whole-file string transform that silently drops newlines".

`build-and-run.md` is in git history in this state, so it predates the current work.

## Impact

- Frontmatter is invisible to the tooling, so these three docs contribute **no** fields, tags or
  relationships to `stats.mjs`.
- `links.mjs` still resolves their wikilinks (it scans text, not structure), so nothing reports as
  broken — which is why this is a warning and not an error.
- A `[[wikilink]]` inside one of them still counts toward inbound links, so the docs are reachable;
  only their *metadata* is lost.

## Fix

Restore the line breaks (the content itself is intact and does not need rewriting), then re-run
`check.mjs` and confirm the `FRONTMATTER_MISSING` warnings for these three are gone.

**Not done in this session** — it is unrelated to the routing work and rewriting three reference
documents mid-refactor would make that commit hard to review. Filed here so it is not lost.

## Related

- [[a-base64-alphabet-error-is-silent]] — the other silent-defect found in this period, and the
  reason a check exists rather than an assumption.