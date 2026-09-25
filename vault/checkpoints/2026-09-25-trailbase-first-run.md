---
type: Checkpoint
status: Superseded
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — TrailBase First Run — 2026-09-25]]"
works_on:
  - "[[TB-0005 Fix the first-run admin password and the backend bind]]"
supersedes:
  - "[[Checkpoint — TrailBase Frontend — 2026-09-24]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - runbook
  - checkpoint
---

# Checkpoint — TrailBase First Run — 2026-09-25

## Objective

Leave a first run that works: a fresh depot gets a known admin password without an init race, and the
backend is reachable from both a browser and the frontend.

## Active tasks

- [[TB-0005 Fix the first-run admin password and the backend bind]] — **Done** (this session).
- [[TB-0004 Build the server-rendered TrailBase frontend]] — Done (verified this session in a real
  browser for the first time).
- [[TB-0002 Wire a frontend to the TrailBase server]] — Backlog (the Next.js client).
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]] — Backlog, held.

## Completed since previous checkpoint

- Established that `trail user change-password` on a depot directory that does not exist yet
  initialises the depot (using this repo's config + migration) and sets the password — so first run
  needs no server and no concurrency.
- Rewrote `trailbase/RUN.BAT` around that: CLI-first init, explicit `--address=127.0.0.1:4000`, no
  marker file, no readiness polling, and `data/` existence as the "already scaffolded" test.
- Found and recorded that TrailBase's default bind is `[::1]:4000` (IPv6 only), which is why the
  dashboard URL the old script opened never worked and why the frontend's `TRAILBASE_URL` could never
  have connected.
- Verified the whole stack in the real, visible Chrome: backend admin login and frontend login, plus
  dashboard, a report and a management screen.

## Current verified state

- `trailbase/RUN.BAT` is the entry point. On a fresh depot (`traildepot/data` absent) it runs
  `trail "--depot=traildepot" user change-password admin@localhost administrator-0ne`, then starts
  `trail "--depot=traildepot" run --address=127.0.0.1:4000`, waits for that address to be listening
  and only then opens `http://127.0.0.1:4000/_/admin/` (a server that never comes up produces a
  warning, not a dead tab).
- The user's depot has `data/` from the earlier run and **already uses the fixed password**, and the
  obsolete marker file has been removed. Future runs therefore skip init and only start the server.
  Delete `traildepot/data/` for a fresh scaffold (which re-applies the fixed password).
- Verified with our real `config.textproto` + migration on a throw-away depot: CLI exit 0, `data/`
  created, config untouched (no default scaffold generated), our migration the only one, server
  started, fixed password accepted, `party_types` returned `customer`/`supplier` — 9/9 checks.
- `RUN.BAT` itself was then executed end to end against a fresh scratch depot: first-run line printed,
  password set, server started, listener confirmed, dashboard opened; the scratch depot's
  `config.textproto` was byte-identical afterwards and the fixed password logged in `200`. Both scratch
  depots were removed and no listeners or `trail.exe` remain on 3100/4000.
- Real-browser verification (Chrome, not headless): backend `127.0.0.1:4000/_/admin/` logged in showing
  **24 tables** on v0.33.22; frontend `127.0.0.1:3100` logged in, dashboard tiles rendered, stock
  report showed the empty state with a `0.00` total, parties screen rendered all relation/enum fields;
  no console errors.
- Both services started for that verification have been stopped; no listeners remain on 3100 or 4000
  and no `trail.exe` is running.

## Files and artifacts changed

- `trailbase/RUN.BAT` — rewritten.
- `trailbase/README.md` — RUN.BAT paragraph corrected.
- `frontend-ssr/.env.example` — IPv4-loopback requirement documented; `.env` created locally
  (git-ignored).
- Vault: `issues/trailbase-default-bind-ipv6-loopback.md`, this file, the WorkSession,
  `tasks/tb-0005-…`; updated `subsystems/trailbase-server.md`,
  `subsystems/frontend-ssr-server-rendered.md`, `projects/trailbase-backend.md`, and marked
  `checkpoints/2026-09-24-trailbase-frontend.md` Superseded.

## Decisions and assumptions that affect next steps

- **`company` replaces `category` everywhere the old system used an item's category** —
  [[Decision — Company replaces category in the TrailBase model]]. The app still reads `items.category`
  because nothing links an item to a company yet; do not build new behaviour on `categories`.
- **Always pass `--address` explicitly in launchers.** Do not rely on TrailBase's `localhost:4000`
  default; see [[Issue — TrailBase binds IPv6 loopback by default]].
- **Initialise a depot with the CLI, not with a running server plus a second process.** The CLI path
  is one process, no timing, and it uses this directory's config and migration.
- Do not reintroduce a marker file: `data/` existence is the scaffold test, and it is what makes a
  hand-changed password safe from being overwritten.
- The fixed password `administrator-0ne` is a deliberately known scaffold credential living in a
  tracked script; it is not a secret and must be changed before the machine is exposed.

## Blockers and unresolved questions

- **How does an item get its company?** `items` has no link to `companies`, so the company/category
  decision cannot be implemented until this is chosen — see
  [[TB-0006 Give items a company and use it in reports]].
- The original hang's root cause was never captured; concurrency during first-run init is the
  best-supported explanation and is now structurally impossible.
- Unverified on the real depot: the management create/update/delete path (deliberately, to avoid
  seeding the user's empty scaffold) — covered by the scratch-depot smoke suite instead.
- `frontend-ssr` still assumes the backend is on IPv4 loopback; if someone rebinds it, they must also
  change `TRAILBASE_URL`.

## Exact next action

[[TB-0006 Give items a company and use it in reports]] once the item→company link is settled (see the
options in that note; (a) `items.company` is recommended) — the rest of the stack is in a working state.

To bring the stack up in the meantime: `trailbase\RUN.BAT`, then `frontend-ssr\RUN.BAT` (set
`SESSION_SECRET` in `frontend-ssr/.env` first). To start over from an empty database, delete
`trailbase\traildepot\data`.

## Verification still required

- Nothing for this change; the CLI-first suite and the browser walkthrough are recorded above and
  repeatable.
- `python scripts/kb_check.py vault` should be re-run after these note changes.

## Resume procedure

1. Read [[TrailBase Backend]] (outcome, current state, task index).
2. Read this checkpoint.
3. Read [[Work Session — TrailBase First Run — 2026-09-25]] for the measurements.
4. Read `trailbase/README.md` (Quick start) and `trailbase/RUN.BAT` before touching the run flow.
5. Read [[Issue — TrailBase binds IPv6 loopback by default]] before changing any address handling.
6. Continue from `Exact next action` unless reality has invalidated it.

> Superseded by [[Checkpoint — Plugins Hub — 2026-09-25]] (2026-09-25).
