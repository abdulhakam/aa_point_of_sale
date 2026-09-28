---
title: Vault guide
type: note
status: active
created: 2026-09-26
tags: [meta, conventions, workflow, how-to]
related_to: ["[[previous-vault-recovery]]"]
---

# Vault guide

How this knowledge base is organised, and the conventions the existing documents follow so a
new one looks like it belongs.

## Ground rules

- `.md` files are the source of truth. `.vault/` is derived and git-ignored.
- Collections are optional. The seven here (`projects`, `systems`, `decisions`, `references`,
  `issues`, `tasks`, `notes`) are the ones this workspace actually needs — do not add an empty
  collection "for later", because empty directories are reported as findings.
- Every collection has exactly one `<name>.schema.json`. The schema's `properties` are a
  *recommendation*: extra frontmatter fields are always fine, and missing ones are warnings,
  never errors.
- Never edit a document just to silence a warning, and never loosen a schema to dodge a finding
  unless a schema change is actually wanted.

## Frontmatter used here

Every document starts with:

```yaml
---
title: Human readable title
type: system            # matches the collection's convention
status: experimental    # collection-specific, where the collection defines one
created: 2026-09-26     # YYYY-MM-DD
tags: [pos, backend, trailbase]
related_to: ["[[other-note]]"]
---
```

Conventions in force:

| Field | Use |
|---|---|
| `type` | the collection's type: `project`, `system`, `decision`, `reference`, `issue`, `task`, `note` |
| `status` | `experimental` / `production` on systems; `proposed`/`accepted`/`superseded` on decisions; `todo`/`doing`/`blocked`/`done` on tasks; `active` elsewhere |
| `system` | on references: which system(s) the note describes (`new`, `legacy`, `both`) |
| `locator` | on systems: the directory the system lives in, e.g. `trailbase/src/` |
| `belongs_to` | a single **wikilink** to the parent document (a decision belongs to the migration project) |
| `related_to` | a list of **wikilinks** to peers |
| `decided_on` | on decisions: `YYYY-MM-DD`, when the choice was made |

Links inside frontmatter must be quoted wikilinks — `"[[trailbase]]"` — or YAML reads the
brackets as a nested list.

## Writing conventions

- **Titles** resolve as frontmatter `title` → first `# H1` → filename. Both are set here.
- **Filenames** are URL-safe slugs. Prefix task slugs with their ticket id
  (`tb-0012-…`, `pos-0027-…`) — the `tb-`/`pos-` prefixes come from the ticket series already
  used in the code comments (`POS-0009`, `POS-0011`, `POS-0026`, `TB-0008`).
- **Wikilinks** resolve by filename stem across the whole vault, and stems must be unique or the
  link is ambiguous. That is why the four system notes are the bare names (`trailbase`,
  `runtime-js-guest-platform`, `backend`, `frontend`) — nothing else may take those stems.
- **Subtasks** are GFM checkboxes (`- [ ]` / `- [x]`). Hybrid inline metadata (`[key:: value]`)
  is not used anywhere in this vault.
- **Dates** are `YYYY-MM-DD`.
- **Evidence over assertion.** Every claim in `issues/`, `systems/` and `references/` should
  point at the file, migration, command or measured result that establishes it. Where a claim
  came from a README rather than from reading code, the note says so. This is what makes the
  vault worth reading instead of the source.

## Which collection for what

| You have… | Put it in |
|---|---|
| A durable choice with rationale worth not re-litigating | `decisions/` |
| A fact about how a system works or how to operate it | `systems/` or `references/` |
| A verified defect, gap or upstream limitation | `issues/` |
| Work that can be finished and checked off | `tasks/` |
| A workstream with a definition of done | `projects/` |
| Anything else, including vault meta | `notes/` |

If a "fact" turns out to be a decision, split it: the decision goes to `decisions/`, the
mechanism goes to `references/`, and they link to each other. [[trailbase-drop-sql-views]] and
[[reports-and-ledgers]] are the worked example — the rationale in one, the arithmetic in the
other.

## Running the tools

Resolve the skill directory once (default install shown), then:

```sh
node ~/.agents/skills/opinionated-vault/scripts/check.mjs vault            # errors + warnings
node ~/.agents/skills/opinionated-vault/scripts/check.mjs vault --strict   # warnings fail too
node ~/.agents/skills/opinionated-vault/scripts/links.mjs vault            # broken/ambiguous wikilinks
node ~/.agents/skills/opinionated-vault/scripts/stats.mjs vault            # full report
node ~/.agents/skills/opinionated-vault/scripts/stats.mjs vault --write-report
node ~/.agents/skills/opinionated-vault/scripts/collection.mjs vault list  # collections + doc counts
node ~/.agents/skills/opinionated-vault/scripts/collection.mjs vault add <name>
node ~/.agents/skills/opinionated-vault/scripts/new.mjs vault <collection> "Title" --tags a,b
```

`check.mjs` exits 1 only for a structural error: a collection with documents but no schema, an
unreadable schema, or unparseable frontmatter. Everything else — missing recommended fields,
unresolved links, tag case variants, unsafe names — is advisory. `links.mjs` exits 1 for any
broken or ambiguous link, and it is the one to run after renaming or adding notes.

Reports are written to `.vault/reports/` (`check.json`, `links.json`, `stats.md`) and are never
source.

## Adding a document

1. Pick the collection (table above).
2. `new.mjs` for a correctly-shaped stub, or author the file directly following the frontmatter
   table above.
3. Add at least one inbound link from an index (`README.md`, [[aa-point-of-sale]],
   [[system-status-overview]]) so the new note is reachable and not an orphan.
4. Link out with `[[wikilinks]]` that resolve — run `links.mjs` and fix anything broken by
   pointing at the right note rather than guessing.
5. `check.mjs`, then `stats.mjs --write-report` to refresh the derived report.

## Adding a collection

```sh
node ~/.agents/skills/opinionated-vault/scripts/collection.mjs vault add systems
```

Then re-run `init.mjs` with the same name if you want the catalog's recommended schema rather
than the generic one, and add the collection to the table in `README.md` and to the list above.
Only do this when there is content to put in it.

## Working style this vault is built for

The vault is meant to be updated **as work happens**, not batched at the end:

- Update the `status` in the owning task before and after a chunk of work.
- When a choice gets made, write the decision note immediately — the rationale is cheapest to
  capture at the moment it is decided.
- When something is proven wrong, correct the note and say what the earlier claim was, rather
  than deleting it. [[previous-vault-recovery]] is an example of recording the correction
  instead of hiding it.
- Keep "what is next" in the project note's `Sequence` section so a fresh session can pick up
  from the vault alone.

## Related

- [[system-status-overview]] — the current state in one screen.
- [[previous-vault-recovery]] — the earlier knowledge base, still in git history.
- [[README]] — the vault index.
