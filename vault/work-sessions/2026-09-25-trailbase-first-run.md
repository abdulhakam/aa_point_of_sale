---
type: WorkSession
status: Completed
started: 2026-09-25
updated: 2026-09-25
belongs_to:
  - "[[TrailBase Backend]]"
works_on:
  - "[[TB-0005 Fix the first-run admin password and the backend bind]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
created: 2026-09-25
tags:
  - trailbase
  - runbook
  - session
---

# Work Session — TrailBase First Run — 2026-09-25

## Objective

Make the first `RUN.BAT` leave a backend the user can actually log into — a known admin password,
no init race, and a dashboard URL that loads (frontend included).

## Starting state (verified this session)

- The first run of the new `RUN.BAT` left `trail.exe` alive (PID 23864, started 10:32, 1.5 s CPU,
  419 MB) with **no listening socket on any family**, so `http://127.0.0.1:4000/_/admin/` was refused.
  `traildepot/data/*.db` and the marker file were all written at 10:32.
- `netstat` without `-a` cannot show listening sockets — an early check that omitted it was worthless
  and produced a wrong intermediate conclusion, corrected by re-running with `-a` and by probing
  `127.0.0.1`, `localhost` and `[::1]` directly (all unreachable).
- The depot itself was intact: data present, admin created, fixed password already applied.

## Plan

1. Establish what the CLI can do on a depot that does not exist yet.
2. Verify the "CLI-first" first-run path on a fresh depot with this repo's real config and migration.
3. Rewrite `RUN.BAT` around it, and fix whatever else the same investigation exposes.
4. Prove it in the real browser: log into the backend admin and the frontend.

## Activity log

1. **CLI surface.** `trail user change-password <user> <password>`; `trail run --address` defaults to
   `localhost:4000`; `trail admin list` exists for recovery.
2. **CLI-first works, and safely.** Against a non-existent depot directory the CLI initialised the
   depot and set the password (exit 0); against an initialised depot an unknown user exits 1 — so it
   creates users only as part of depot creation, which is exactly the first-run case.
3. **Verified on a scratch depot (9/9)** with our `config.textproto` + migration: exit 0, `data/`
   created, our config untouched (no default scaffold), our migration still the only one, server then
   started, fixed password logged in, `party_types` returned `customer`/`supplier`.
4. **Found the bind bug.** The same run logged `Listening on http://[::1]:4000` — IPv6 loopback only;
   `127.0.0.1:4000` is unreachable. That explains the original dashboard failure (the script had
   always opened `127.0.0.1`) and would have broken every `frontend-ssr` request, whose
   `TRAILBASE_URL` is `http://127.0.0.1:4000`. Recorded as an Issue.
5. **Rewrote `RUN.BAT`** around CLI-first: no second process while the server initialises, no marker
   file, no readiness polling, `--address=127.0.0.1:4000` explicit, `data/` existence as the
   "already scaffolded" test (so a hand-changed password is never overwritten).
6. **Proved it in the real Chrome** (not headless): logged into the TrailBase admin as
   `admin@localhost` (24 tables, v0.33.22), then into the frontend, and walked the dashboard, the
   stock report (empty state, `0.00` total) and the parties management screen — no console errors.
7. **Executed `RUN.BAT` end to end** against a fresh scratch depot (through its `DEPOT` override):
   first-run line, password set, server started, listener confirmed, dashboard opened; the scratch
   depot's `config.textproto` was byte-identical afterwards and the fixed password logged in `200`.
   That run exposed a weakness worth fixing: on a failed start the script still opened the dashboard,
   which is exactly the dead tab the user reported — so the start path now waits for the listener and
   warns instead. (Testing lesson, not a script bug: `set "DEPOT=..."` inside a `cmd /c` string invoked
   from a POSIX shell is mangled; reading the variable from the environment — which the script does —
   works fine.)
8. **Stopped both services** and confirmed no listeners remained on 3100/4000, removed the scratch
   depots, and closed the browser tabs the runs had opened.

## Changed artifacts

- `trailbase/RUN.BAT` — rewritten (CLI-first init, explicit IPv4 bind, listener wait before opening
  the dashboard).
- `trailbase/README.md` — the RUN.BAT paragraph corrected (no marker; CLI-first; bind).
- `frontend-ssr/.env.example` — documents the IPv4-loopback requirement.
- `frontend-ssr/.env` — created locally (git-ignored) so the frontend could run.
- Vault: new Issue, this WorkSession, `tasks/tb-0005-…`, `checkpoints/2026-09-25-trailbase-first-run.md`;
  updates to `subsystems/trailbase-server.md`, `subsystems/frontend-ssr-server-rendered.md`,
  `projects/trailbase-backend.md` and the superseded `2026-09-24` frontend checkpoint.
- Removed: `traildepot/data/.admin-password-initialized` (design no longer uses a marker).

## Verification performed

- CLI-first on a fresh depot with the real config + migration: 9/9 checks.
- `RUN.BAT` executed end to end on a fresh scratch depot: first-run init, listener confirmed, fixed
  password `200`, config byte-identical.
- Real-browser end-to-end on the user's actual depot: backend admin login and frontend login, three
  frontend screens, zero console errors.
- No stray processes or listeners left; scratch depots removed and extra browser tabs closed.

## Blockers and open questions

- None blocking.
- The cause of the original hang was not captured (its console output is gone and the process was
  killed before any log was read); concurrency during first-run init remains the best-supported
  explanation, and the new design removes the possibility either way.
- The management write path was not exercised against the real depot on purpose; the scratch-depot
  suite covers it.

## Exact next action

None scheduled. `trailbase/RUN.BAT` is the entry point; it now initialises a fresh depot correctly and
binds IPv4 loopback.

## Related

- [[Issue — TrailBase binds IPv6 loopback by default]]
- [[Checkpoint — TrailBase First Run — 2026-09-25]]
