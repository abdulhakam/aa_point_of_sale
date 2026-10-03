---
title: The cutover is guest-only — and the legacy stack stays live until it happens
type: decision
status: accepted
decided_on: 2026-10-03
created: 2026-10-03
updated: 2026-10-03
tags: [cutover, strategy, legacy, migration, blocking, retirement]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[keep-legacy-stack-in-production]]", "[[pos-0028-decide-cutover-plan]]", "[[tb-0012-wire-nextjs-frontend-to-trailbase]]", "[[tb-0013-rework-report-screens-without-views]]"]
---

# The cutover is guest-only — and the legacy stack stays live until it happens

This is the answer [[pos-0028-decide-cutover-plan]] was opened to produce. The **end state** is shape
**B**: the guest, and no Next.js UI. That part is no longer a preference — shape A is not available at
all, because the source shape A would have edited was deleted from git on 2026-09-29.

> **⚠️ CORRECTED 2026-10-03, later the same day.** The first version of this note said the guest "is
> the only frontend" and that the legacy pair was "not in production use". **Both were wrong**, and
> wrongly in the dangerous direction. Two facts settle it:
>
> - `legacyforparity/RUN MINI.BAT` starts `pocketbase.exe serve`, then `node ./standalone/server.js`,
>   then opens `http://127.0.0.1:3000`. **The legacy stack is launchable, and it is the system the
>   shop runs on.** The owner confirms it: the legacy is production, and it is not TrailBase.
> - The trailbase depot is a **development** depot holding an imported *copy* of the production
>   ledger (measured 2026-10-03: 8,930 invoices, 26,526 payments, 23,415 transactions, 943 parties,
>   207 items, 59 areas, 15 companies, 88 expenses), not the production system.
>
> What is actually true: **the legacy stack has no source**, so it can be *run* but never *edited* or
> rebuilt. That is a different fact from "it is out of use", and the first version conflated them.
> [[keep-legacy-stack-in-production]] is therefore **still operative**, not superseded — see
> *What this changes about the old decision* below.

## The evidence that decided the shape

`git ls-tree HEAD` lists the repository root, and there is no `backend/` and no `frontend/`:

```text
.commandcode  .gitignore  .kilo  AGENTS.md  trailbase  vault
```

`git show --stat c167d311` ("deleted frontend/backend", 2026-09-29 21:21:04 +0500) removes both
directories. What remains on disk is `legacyforparity/`, untracked and git-ignored:

| Path | What it is | Runnable? | Editable? |
|---|---|---|---|
| `legacyforparity/backend/` | `pocketbase.exe`, `pb_migrations/`, `p_data/`, `pb_data/`, `RUN *.BAT` | **yes** | no — frozen |
| `legacyforparity/standalone/` | a **compiled** Next.js standalone bundle: `server.js`, `.next/`, `node_modules/`, `public/` | **yes** | no — frozen |
| `legacyforparity/RUN MINI.BAT` | launches both and opens `:3000` | — | — |

`legacyforparity/standalone` has **no `src/`** and its `package.json` has no `build` output — the
scripts are `next dev/build/start`, but there is nothing to build. It runs the way a jar runs.

## Why shape A is unavailable

Shape A was "repoint the Next.js UI at TrailBase": keep `frontend/` as the product and replace its
data layer. That requires editing `frontend/src/app/api/useAPI.ts`, rewriting every `filter:`
expression as `filter[col][$op]=` parameters, and replacing every nested `expand:` — all specified in
detail by [[tb-0012-wire-nextjs-frontend-to-trailbase]]. Every one of those files is gone from git.

Restoring them is **out of scope** for this programme. It would be a source-recovery project, not a
cutover step.

## The decision

1. **The end state is the guest and nothing else.** [[runtime-js-guest-platform]] is what the app
   becomes. Its gap list is [[guest-frontend-feature-parity-gaps]]; its parity target is
   [[guest-ui-is-a-direct-shift-of-legacy]].
2. **Until the cutover happens, the legacy stack keeps running, unchanged.** It is production. The
   guest is the replacement under construction. Nothing about deleting the source changed what the
   shop uses today, and it must not be represented as though it did.
3. **`legacyforparity/` is never edited.** Not to fix a bug, not to add a report, not to repoint it.
   It is frozen. A defect found in the running legacy system is therefore a fact to report, not
   something to fix in place.
4. **[[tb-0012-wire-nextjs-frontend-to-trailbase]] and
   [[tb-0013-rework-report-screens-without-views]] are superseded, not done.** Both presuppose
   editable `frontend/` source. They are marked `blocked` with this note as the reason; their
   checklists stay unticked, because unstarted and finished are different things.

## What this changes about the old decision

**[[keep-legacy-stack-in-production]] stays `accepted`.** Its premise — keep the legacy stack live
until the new pair reaches parity — is what is happening. What ends is the clause *"until a cutover is
explicitly decided"*: it has now been decided, and it decided shape B.

Only its **guardrails** are obsolete, because they name paths that no longer exist:

- ~~"Do not modify `backend/pb_migrations/`"~~ → the path is now `legacyforparity/backend/`, and the
  rule is the same and stronger: never edit it.
- ~~"do not repoint `frontend/.env.local` at TrailBase"~~ → impossible; there is no
  `frontend/.env.local`, and there will not be one.
- *"make every change on the new side additive"* → **still in force**, and now the whole policy.

Its consequence "the migration's clock is not started, because the stack that would retire is also
the stack that is still earning" is **still exactly true**.

## The real constraint, stated properly

The risk is not that the legacy is unused. It is:

> **The system the shop depends on cannot be repaired.**

A bug found in the running legacy stack cannot be fixed in the running legacy stack. The only
available responses are "live with it", "fix forward in the guest and get to the cutover", or "stop
and restore the deleted source". That is a narrower and more serious constraint than the vault
previously described, and it is the strongest argument for finishing the guest.

## The rollback story

Rollback is **not** "rebuild the legacy app". It is:

- run `legacyforparity/RUN MINI.BAT`, and
- the data directories under `legacyforparity/backend/p{_b,}data/`.

That is a **frozen artefact, not a rebuild** — with one important difference from the first version of
this note: because the legacy stack is *already running in production*, this is not a rollback at
all. It is **not switching away from the legacy stack**. Rollback only becomes meaningful after the
cutover, and at that point it means "run the frozen bundle again", which cannot be adapted to
whatever broke.

- ⚠️ **There is no git copy of `legacyforparity/`.** It is untracked and ignored. If it is deleted,
  cleaned, or lost, the system the shop runs on is gone, with no recovery but git history for
  `c167d311^` — which holds an 11,182,080-byte `backend/p_data/data.db` but **not** the 17,960,960-byte
  `backend/pb_data/data.db`. See [[pocketbase-data-dirs-in-git]].

## Evidence

- `git ls-tree HEAD --name-only` — the root listing, no `backend/`, no `frontend/`.
- `git show --stat c167d311` — the deletion, 2026-09-29.
- `legacyforparity/RUN MINI.BAT` — `pocketbase.exe serve` → `node ./standalone/server.js` → open `:3000`.
- `Get-ChildItem legacyforparity/standalone` — `server.js`, `.next`, `node_modules`, `public`,
  `package.json`, and **no `src`**.
- Row counts over `trailbase/traildepot/data/main.db` (2026-10-03, read from a copy so the WAL is
  visible) — 8,930 invoices / 26,526 payments / 23,415 transactions / 943 parties / 207 items.
- `git cat-file -s c167d311^:backend/p_data/data.db` → `11182080` — the blob still in history.

## Related

- [[pos-0028-decide-cutover-plan]] — the task this note closes.
- [[keep-legacy-stack-in-production]] — **still accepted**; this note ends only its "until a cutover
  is explicitly decided" clause.
- [[backend]] / [[frontend]] — the frozen production stack, described as it actually now exists.
- [[tb-0012-wire-nextjs-frontend-to-trailbase]] / [[tb-0013-rework-report-screens-without-views]] —
  superseded because both need source that no longer exists.
- [[guest-frontend-feature-parity-gaps]] — what the guest still owes before a cutover is possible.
- [[pocketbase-data-dirs-in-git]] — the untracked, single-copy risk.