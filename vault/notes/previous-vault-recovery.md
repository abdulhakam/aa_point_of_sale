---
title: Previous vault recovery
type: note
status: active
created: 2026-09-26
tags: [meta, git, recovery, history]
related_to: ["[[vault-guide]]"]
---

# Previous vault recovery

This workspace had an earlier knowledge base — a different system (a custom `kb.py` validator
plus `kb-*` agent skills), with different collections (`subsystems/`, `checkpoints/`,
`work-sessions/`, `projects/`, `decisions/`, `issues/`, `notes/`, `references/`, `tasks/`).
It was removed from the working tree in commit `8f0349c` ("cleanup"), together with
`.agents/skills/kb-*` and the `caveman-*` skills.

**Nothing is lost: the whole thing is in git history.** It is the detailed record of the
performance programme and the TrailBase build-out, so it is worth reading before re-inventing
any of it.

⚠️ **The current vault is the one detailed in [[vault-guide]].** The instructions below are for
*reading* the old material and for selectively lifting content into the new structure — not for
restoring the old system, which existed alongside tooling that is no longer installed.

## Where it is

| Thing | Commit | Note |
|---|---|---|
| The previous vault | `8f0349c^` (i.e. `7b11a04`) | ~80 files under `vault/` |
| `frontend-tb/` | `14b0518^` | the abandoned Vite + React TrailBase client |
| `docs/diagrams/` | `7b11a04` | Archify diagrams: system architecture, three sequence diagrams, a dataflow |

Useful history anchors:

```text
8f0349c (HEAD -> tb-from-here)  cleanup                     <- deleted vault/ and the kb-* skills
7b11a04 (master)                on the trailbase side of things
14b0518                         removed frontend-tb
ea2bd12                         feat(frontend-ssr): Report refresh and page host
bd81f2f                         feat(frontend-ssr): Add plugins hub and v1 import
4df9f50                         docs(vault): Record that company replaces category
186c61f                         fix(trailbase): Reliable first run and IPv4 bind
8dc815f                         feat(frontend-ssr): Add SSR TrailBase frontend
26c56f0                         Re-verify the TrailBase backend on v0.33.22
10b60fd                         Rewrite the TrailBase schema with integer enums
006f4d1                         Fix stale counts in backend PocketBase vault note
99778cf                         POS-0026: Apply button on report filters
```

## Read a file without touching the tree

```powershell
# one file
git show "8f0349c^:vault/references/reports-and-ledgers.md"

# list everything that was there
git ls-tree -r --name-only 8f0349c^ -- vault

# search the old vault across all its revisions
git log --oneline --all -- vault/
```

## Recover everything (into a scratch directory)

Do this **outside** the workspace, so the old layout cannot be confused with the current one:

```powershell
git worktree add ..\_vault-recovery "8f0349c^"
# read ..\_vault-recovery\vault\ ...
git worktree remove ..\_vault-recovery
```

Or extract without a worktree:

```powershell
git archive "8f0349c^" vault | tar -x -C ..\_vault-recovery
```

## What was there, and where it belongs now

| Old collection | Files | Maps to |
|---|---|---|
| `vault/subsystems/` | `trailbase-server.md`, `frontend-ssr-server-rendered.md`, `backend-pocketbase.md`, `frontend-nextjs-app.md`, `desktop-deployment.md` | `systems/` (the first four are superseded by [[trailbase]], [[runtime-js-guest-platform]], [[backend]], [[frontend]]) |
| `vault/decisions/` | 10 files | `decisions/` (9 are re-authored here; `use-pocketbase-and-nextjs.md` is the original choice that [[keep-legacy-stack-in-production]] now reframes) |
| `vault/issues/` | 10 files | `issues/` (the TrailBase ones are carried over; `declarative-pages-slower-than-server-rendering.md` and `no-manual-report-refresh-trigger.md` were since **fixed** — the manual refresh control and the page host shipped in `ea2bd12`) |
| `vault/tasks/` | ~30 files | `tasks/` — the `pos-*` series is the performance programme's ticket trail (POS-0005 … POS-0026); read it before proposing a performance task |
| `vault/checkpoints/` | 11 dated files | historical narrative; `notes/` if a specific one is still wanted, otherwise leave in git |
| `vault/work-sessions/` | 4 files | historical narrative; same treatment |
| `vault/references/` | `data-model.md`, `glossary.md`, `route-map.md`, `reports-and-ledgers.md`, `build-and-run-scripts.md`, `performance-baseline.md`, `reports-vs-pages.md`, `trailbase-frontend-system-diagrams.md` | `references/` — the first four are re-authored here; `reports-vs-pages.md` and `trailbase-frontend-system-diagrams.md` have no current equivalent and are the ones most worth lifting |
| `vault/projects/` | `aa-point-of-sale.md`, `trailbase-backend.md` | `projects/` |
| `vault/notes/` | `knowledgebase-guide.md`, `import-from-v1-plugin.md` | `notes/` |
| `vault/AGENT.md`, `vault/AGENTS.md`, `vault/README.md` | | described the *old* tooling; superseded by [[vault-guide]] and the vault `README.md` |

## Claims in the old vault that are now out of date

Worth knowing before trusting anything read out of history:

- **`no-manual-report-refresh-trigger.md`** — no longer true. `/reports/refresh` and the
  green-indicator button exist; see [[runtime-js-guest-platform]] and
  [[trailbase-incremental-report-refresh]].
- **`declarative-pages-slower-than-server-rendering.md`** — no longer true as stated; the page
  host now serves finished report results rather than making the browser derive them, and
  retires report logic from the client.
- **`report-cache-lag-after-client-side-import.md`** — the fix is `invalidate(tables)` plus the
  refresh job; see [[trailbase-incremental-report-refresh]].
- **`standalone-build-drift.md`** — `npm run build:standalone` still exists in
  `frontend/package.json`, but nothing in this vault asserts the build was recently verified.
  Treat the drift claim as unverified.
- **`trailbase-company-replaces-category`** (decision, commit `4df9f50`) is the ancestor of the
  still-open question in [[tb-0014-point-company-fields-at-companies]] — read it before
  reopening that.
- The old `vault/references/data-model.md` and `glossary.md` predate the integer-enum rewrite
  (`10b60fd`); where they disagree with [[data-model]] and [[glossary]], the current notes win.
- The `pos-0022-upgrade-pocketbase-v0-40-4` task exists in the old tree, but `backend/` ships
  **0.22.55** and `git log` shows `1db2300 POS-0019/0020: upgrade PocketBase 0.22.9 -> 0.22.55`.
  The 0.40.4 task was evidently not done; confirm with
  `git show "8f0349c^:vault/tasks/pos-0022-upgrade-pocketbase-v0-40-4.md"` before relying on it.

## `frontend-tb/` — the abandoned TrailBase client

Deleted in `14b0518`, still in history. It was a Vite + React + TypeScript client written
against the **earlier** TrailBase scaffold, and `trailbase/README.md` records that it uses the
older names and shapes (`products` instead of `items`, `companies2parties` /
`companies2orderbookers` instead of `party_companies` / `order_booker_companies`,
`partiesEnumType` instead of `party_types`, TEXT enums), so it needs those renamed before it
could talk to the current schema.

Inspect it with:

```powershell
git ls-tree -r --name-only 14b0518^ -- frontend-tb
git show "14b0518^:frontend-tb/src/collections/areas.ts"
```

Its `src/collections/` directory is a per-collection client layer that may still be useful as a
reference when [[tb-0012-wire-nextjs-frontend-to-trailbase]] binds the legacy frontend to
TrailBase.

## Related

- [[vault-guide]] — the current conventions.
- [[system-status-overview]] — the current state.
- [[trailbase-migration]] — the workstream the old notes describe.
