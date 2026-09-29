# AGENTS.md

Operating rules for agents working in `aa_point_of_sale`.

## The vault is the project's memory

`vault/` is an **opinionated vault** (local-first, file-first knowledge base). It is the
authoritative, continuously-current description of this workspace: the four systems, the data
model, the decisions already made, the verified defects, and the work in flight.

Treat the vault as the first place you read and the last place you write on **every** task:

- **Read the vault before the source.** Before exploring `backend/`, `frontend/`,
  `trailbase/host/`, or `trailbase/app/`, consult the vault. Start at `vault/README.md`, then
  `vault/notes/system-status-overview.md`, then the relevant collection. Only read source to
  verify a current detail or fill a gap the vault does not cover.
- **Answer from the vault.** Questions about how a system works, what is decided, what is
  broken, or what is next are answered from vault documents first.
- **Write the vault as part of the work.** The vault must never lag behind reality.

Authoring conventions actually in force (frontmatter fields, status vocabulary, slug rules,
wikilink rules, evidence-over-assertion) live in **`vault/notes/vault-guide.md`** — read it
before adding or editing documents, and follow it exactly.

## Use the opinionated-vault skill, always

Load the `opinionated-vault` skill (skill tool) whenever a task touches the knowledge base:
creating, editing, auditing, validating links, adding a collection, or producing a vault
report. Do not hand-roll vault structure; use the skill's tools.

Resolve the skill directory once. On this machine the default install is
`$env:USERPROFILE\.agents\skills\opinionated-vault` (`~/.agents/skills/opinionated-vault`).
All commands take the vault path first:

```pwsh
$skill = "$env:USERPROFILE\.agents\skills\opinionated-vault\scripts"

node "$skill\check.mjs"       vault                  # structure + frontmatter (errors exit 1)
node "$skill\links.mjs"       vault                  # broken/ambiguous wikilinks (exit 1)
node "$skill\stats.mjs"       vault --write-report   # full statistics report
node "$skill\collection.mjs"  vault list             # collections + document counts
node "$skill\collection.mjs"  vault add <name>       # only when there is content for it
node "$skill\new.mjs"         vault <collection> "Title" --tags a,b
```

`check.mjs` errors are: a collection with documents but no schema, an unreadable schema, or
invalid frontmatter YAML. Everything else is advisory. `links.mjs` exits 1 on any broken or
ambiguous link and is mandatory after renaming or adding notes.

## Real-time knowledge-base discipline

Update the vault **in the same turn as the change**, not at the end of the session and never
"later". The vault should reflect project state at every point, even mid-task.

Triggers that require an immediate vault write:

| Moment | Action in `vault/` |
|---|---|
| Starting a work item | Move the owning task's `status` to `doing` before the first edit. Create the task note if none exists. |
| A choice is made | Write the `decisions/` note **immediately** — rationale is cheapest at the moment of deciding. |
| A defect, gap, or upstream limitation is verified | Write the `issues/` note immediately, with the file/migration/command/measurement that proves it. |
| A system fact or contract changes | Update the `systems/` or `references/` note in the same turn as the code change. |
| A prior claim was wrong | Correct the note and state what the earlier claim was. Never delete the old claim to hide it. |
| Finishing or blocking a work item | Set the task `status` to `done`/`blocked`, tick its GFM checkboxes, update the project note's `Sequence`. |
| End of any turn that changed the project | Run `links.mjs` and `check.mjs`; refresh `stats.mjs --write-report`. |

Rules of thumb:

- If you learned something a future session would need to re-derive, it belongs in the vault
  **now**.
- Keep "what is next" in `vault/projects/aa-point-of-sale.md` (or the active workstream note)
  so a fresh session can pick up from the vault alone.
- Do not batch vault updates to the end of a task. A long task with a stale vault is a failed
  vault update.
- Do not ask permission to maintain the vault; it is a default part of every task.

## Which collection gets what

| You have… | Put it in |
|---|---|
| A durable choice with rationale worth not re-litigating | `vault/decisions/` |
| A fact about how a system works or how to operate it | `vault/systems/` or `vault/references/` |
| A verified defect, gap, or upstream limitation | `vault/issues/` |
| Work that can be finished and checked off | `vault/tasks/` |
| A workstream with a definition of done | `vault/projects/` |
| Anything else, including vault meta | `vault/notes/` |

The seven collections in use are `projects`, `systems`, `decisions`, `references`, `issues`,
`tasks`, `notes`. Do **not** create empty collections "for later" — empty directories are
reported as findings.

Ticket-prefixed task slugs follow the existing series (`tb-00NN-…`, `pos-00NN-…`).

## Guardrails

- `vault/**/*.md` and `*.html` are the source of truth. `vault/.vault/` is derived, git-ignored,
  and rebuildable — never treat reports there as source.
- Never delete or rewrite a document just to silence a warning, and never loosen a schema to
  dodge a finding unless a schema change is genuinely wanted.
- Never edit a document with `archived: true`.
- Frontmatter wikilinks must be quoted: `"[[trailbase]]"`.
- Wikilink stems must be unique across the vault; fix a broken link by pointing at the right
  note, never by guessing. `links.mjs` is the arbiter.
- Extra frontmatter fields are always allowed; missing recommended fields are warnings, not
  errors.
- The legacy pair (`backend/`, `frontend/`) is what runs in production. Do not describe or
  route the new system (`trailbase/`, with the compiled engine in `trailbase/host/` and the
  editable application in `trailbase/app/`) as live unless the vault says so.

## Validate before you declare done

For any task that touched the vault:

1. `node "$skill\links.mjs" vault` — must exit 0.
2. `node "$skill\check.mjs" vault` — must exit 0 (zero errors).
3. `node "$skill\stats.mjs" vault --write-report` — refresh `.vault/reports/`.

State accepted warnings explicitly in your summary; warnings are a choice, not a failure.
