---
title: Four vault documents have lost their line structure
type: issue
status: fixed
severity: medium
created: 2026-09-30
updated: 2026-10-03
tags: [vault, tooling, defect, documentation]
belongs_to: "[[vault-guide]]"
related_to: ["[[a-base64-alphabet-error-is-silent]]", "[[settle-structural-claims-with-the-owning-artifact]]", "[[cutover-is-guest-only]]"]
---

# Four vault documents have lost their line structure

> **FIXED 2026-10-03** — all four rebuilt. ⚠️ **The original diagnosis in this note was wrong on two
> points**, and both are corrected below rather than quietly dropped.

## Symptom

Four vault documents had their entire **body** collapsed onto a **single line**:

| Document | Collapsed line | Length |
|---|---|---|
| `vault/references/build-and-run.md` | line 14 | 8,629 chars |
| `vault/references/environment.md` | line 13 | 9,160 chars |
| `vault/systems/runtime-js-guest-platform.md` | line 15 | 7,837 chars |
| `vault/projects/trailbase-migration.md` | lines 56–58 (**missed by the original note**) | 9,635 + 6,124 chars |

## Two claims in the original note that were wrong

**1. "Their YAML frontmatter is not parsed at all — `check.mjs` reports `FRONTMATTER_MISSING`."**

False. The frontmatter was intact in all four: it occupies lines 1–9 (or 1–11) and is correctly
delimited by `---`. Only the **body after the closing `---`** collapsed. `check.mjs` never reported
`FRONTMATTER_MISSING` for these documents — a baseline run on 2026-10-03, taken *before* any repair,
produced 31 warnings of which **none** was `FRONTMATTER_MISSING`: 30 `FRONTMATTER_FIELDS` and one
`DIR_EMPTY`.

The practical difference matters: because the frontmatter survived, the documents kept their
`title`, `type`, `status` and `tags`, and `links.mjs` resolved every wikilink in them. Nothing the
tooling checks had gone red. **This defect was invisible to every automated check in the vault** — it
was found by a human noticing that a document was unreadable.

**2. "`environment.md` is truncated mid-table and the rest of the file is one paragraph, so content is
genuinely missing."**

False — the content was all present, just un-split. A mechanical re-split of line 13 recovers the
complete document: the `## Ports` table with all five rows, the `## Guest-WASM platform` section, the
key-paths table, all four `## Environment variables by system` subsections, `## Credentials`,
`## Business identity mismatch` and a `## Related` list. Nothing was lost; the blank lines were.

## Cause

Still not established. The content reads as a correct document written without newlines — consistent
with a tool that read each file, transformed it, and wrote it back as a single joined string (a
whole-buffer `.replace()`, or a `Set-Content` of one joined line) rather than a deliberate author.
The same shape appears elsewhere in this project's history: `route.ts` losing its structure to a
blanket `-replace`, and `legacyforparity/` files being touched at all.

`build-and-run.md` is in git history in this state, so it predates the current work.

## Impact, as it actually was

- **No tooling signal at all.** No error, no warning. `check.mjs` exit 0, `links.mjs` exit 0, all
  wikilinks resolved, frontmatter counted normally.
- **The documents were unreadable to edit.** A reviewer opening `environment.md` saw one 9,160-char
  line. Any `edit` against it needed the exact collapsed substring, so corrections to these files were
  effectively blocked.
- **Corrections to their content silently did not happen.** This is the real cost. Because the files
  were hostile to edit, their *content* drifted: `environment.md` still listed ports `3000`, `8090`
  and `6006` as live, `build-and-run.md` still presented three dead `.BAT` files as the start order,
  `runtime-js-guest-platform.md` still said "not wired to production" and named a `host/` directory
  that does not exist, and `route-map.md` — which is *also* in this class of drift — still listed
  fifteen routes as "not built". A broken document cannot be corrected, so it silently becomes a
  source of false claims.

## Fix

The content is intact, so this is a re-split, not a rewrite. Each file was rebuilt by hand rather than
by script: the mechanical transformation is ambiguous (a heading's title cannot be told from the prose
after it, and `|---|---|---|` is not distinguishable from a row boundary), and a script that guesses
wrong produces a document that *looks* repaired and is not.

Each rebuilt document was then corrected against the tree in the same pass, so the repair is where the
stale claims died. All four now open with a note saying they were rebuilt, and what was corrected.

`check.mjs` exit 0, `links.mjs` exit 0, `stats.mjs --write-report` refreshed.

## The lesson

This is [[settle-structural-claims-with-the-owning-artifact]] applied to the vault's own tooling. The
original note asserted a *mechanism* ("frontmatter is not parsed") from a *symptom* (a long line)
without opening the file. One `read` of line 1 would have shown intact frontmatter, and the claim
would never have been made.

The second lesson is sharper: **a defect that no check catches is a defect that will be found again.**
If a document collapsing is possible in this workflow, there should be a check for it — something like
a maximum line length, or a `FRONTMATTER_MISSING`-style warning for a document whose longest line
exceeds some multiple of the median. Not implemented here; recorded as worth considering.

## Related

- [[a-base64-alphabet-error-is-silent]] — the other silent defect from this period, and the reason a
  check exists rather than an assumption.
- [[settle-structural-claims-with-the-owning-artifact]] — the rule this note's own diagnosis broke.
- [[cutover-is-guest-only]] — the correction pass that the collapse had been blocking.