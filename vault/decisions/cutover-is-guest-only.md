---
title: The cutover is guest-only — the legacy stack is a frozen parity oracle, not production
type: decision
status: accepted
decided_on: 2026-10-03
created: 2026-10-03
tags: [cutover, strategy, legacy, migration, blocking, retirement]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[keep-legacy-stack-in-production]]", "[[pos-0028-decide-cutover-plan]]", "[[tb-0012-wire-nextjs-frontend-to-trailbase]]", "[[tb-0013-rework-report-screens-without-views]]"]
---

# The cutover is guest-only — the legacy stack is a frozen parity oracle, not production

This is the answer [[pos-0028-decide-cutover-plan]] was opened to produce. It is shape **B**, and it is
no longer a preference: shape A is not available at all, because the source shape A would have
edited was deleted from git on 2026-09-29.

## The evidence that decided it

`git ls-tree HEAD` lists the repository root, and there is no `backend/` and no `frontend/`:

```text
.commandcode  .gitignore  .kilo  AGENTS.md  trailbase  vault
```

`git show --stat c167d311` ("deleted frontend/backend", Abdul Hakam, 2026-09-29 21:21:04 +0500)
removes both directories, including `backend/p_data/data.db` (11,182,080 bytes) and the rest of the
tracked PocketBase data. What remains on disk is `legacyforparity/`, which is **untracked and now
git-ignored**:

| Path | What it is | Editable? |
|---|---|---|
| `legacyforparity/backend/` | `pocketbase.exe`, `pb_migrations/`, `p_data/`, `pb_data/`, the `RUN *.BAT` scripts | no — frozen |
| `legacyforparity/standalone/` | a **compiled** Next.js standalone bundle: `server.js`, `.next/`, `node_modules/`, `public/` | no — frozen |

`legacyforparity/standalone` has **no `src/`**. There is no `frontend/src/app/api/`, no
`package.json` with a `dev`/`build`/`serve` script set, no `next.config.js`, no `tsconfig.json`.
Nothing in it can be edited, rebuilt, or repointed at TrailBase. It runs the way a jar runs.

`guests/` exists and is empty — the vault has recorded it as deleted since 2026-09-28.

## Why shape A is unavailable

[[pos-0028-decide-cutover-plan]] posed two shapes. Shape A was "repoint the Next.js UI at TrailBase":
keep `frontend/` as the product and replace its data layer. That requires editing
`frontend/src/app/api/useAPI.ts`, rewriting every `filter:` expression as `filter[col][$op]=`
parameters, and replacing every nested `expand:` — all of which
[[tb-0012-wire-nextjs-frontend-to-trailbase]] specified in detail. Every one of those files is gone
from git.

Restoring them is explicitly **out of scope** for this programme (see the plan's *Out of scope*).
It would be a source-recovery project, not a cutover step, and it would be a poor trade: the guest
already has the invoicing, printing and cash-memo screens the shape-A argument assumed were missing.

## The decision

1. **The legacy pair is a frozen parity oracle.** It is never edited, never a cutover target, and
   not source. It exists to answer "what did the old screen compute?" — nothing more.
2. **The guest is the only UI.** [[runtime-js-guest-platform]] is the product. Its gap list is
   [[guest-frontend-feature-parity-gaps]] and its parity target is
   [[guest-ui-is-a-direct-shift-of-legacy]].
3. **[[tb-0012-wire-nextjs-frontend-to-trailbase]] and [[tb-0013-rework-report-screens-without-views]]
   are superseded, not done.** Both presuppose editable `frontend/` source. They are marked
   `blocked` with this note as the reason; their checklists are deliberately left unticked, because
   unstarted and finished are different things.
4. **[[keep-legacy-stack-in-production]] is superseded.** Its premise — two runnable stacks, keep the
   old one live — ended when the old one's source was deleted.

## What "no rollback" actually means here

This is the consequence worth stating plainly, because it is a real reduction in safety and it was
not the shape of the original question.

The rollback story is **not** "rebuild the legacy app". It is: the compiled bundle at
`legacyforparity/standalone/` plus the data directories under `legacyforparity/backend/`. That is a
**frozen artefact, not a rebuild**:

- `standalone/server.js` can be started and served. It cannot be changed. If the guest needs a
  feature the bundle does not have, the bundle does not gain it.
- `legacyforparity/backend/pb_data/data.db` (17,960,960 bytes) and
  `legacyforparity/backend/p_data/data.db` (745,472 bytes) are the legacy data. They are
  untracked and ignored, so they exist in exactly one place: that folder.
- ⚠️ **There is no git copy of `legacyforparity/`.** If it is deleted, cleaned, or lost, the parity
  oracle is gone permanently. An 11,182,080-byte `backend/p_data/data.db` blob survives in history at
  `c167d311^`, but that is the smaller `p_data` copy, not the 18 MB `pb_data` database.

## What is given up, accepted knowingly

- **No source-level rollback.** A defect found after cutover is fixed forward in the guest, or the
  frozen bundle is run as-is.
- **The vault's "four systems, legacy is production" framing is wrong** and every document that
  repeats it is corrected by this decision: the correction sweep is recorded in the drift audit.
- **The parity oracle is one untracked folder away from being lost**, which is a risk the previous
  framing hid — a git-ignored artefact looks *safer* than a tracked one and is not.

## Evidence

- `git ls-tree HEAD --name-only` — the root listing, no `backend/`, no `frontend/`.
- `git show --stat c167d311` — the deletion, 2026-09-29.
- `git diff -- .gitignore` (uncommitted at the time of this decision) — replaced
  `/frontend/...`, `/backend/...` and `standalone` rules with `/legacyforparity/`.
- `Get-ChildItem legacyforparity/standalone` — `server.js`, `.next`, `node_modules`, `public`,
  `package.json`, and no `src`.
- `git cat-file -s c167d311^:backend/p_data/data.db` → `11182080` — the blob still in history.

## Related

- [[pos-0028-decide-cutover-plan]] — the task this note closes.
- [[keep-legacy-stack-in-production]] — the superseded interim policy.
- [[tb-0012-wire-nextjs-frontend-to-trailbase]] / [[tb-0013-rework-report-screens-without-views]] —
  superseded because both need source that no longer exists.
- [[backend]] / [[frontend]] — the frozen oracle, described as it actually now exists.
- [[guest-frontend-feature-parity-gaps]] — what the guest still owes, now the only UI.
- [[pocketbase-data-dirs-in-git]] — the risk this decision's rollback story runs through.