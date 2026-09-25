---
type: Task
status: Done
ticket: TB-0005
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Issue — TrailBase binds IPv6 loopback by default]]"
  - "[[TB-0004 Build the server-rendered TrailBase frontend]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - runbook
  - networking
---

# TB-0005 Fix the first-run admin password and the backend bind

## Goal

A first `RUN.BAT` on a fresh depot leaves a backend that is reachable from a browser and from
`frontend-ssr`, with a known admin password and no race during depot initialisation.

## Done when

- A fresh depot gets `admin@localhost` with a fixed, known password.
- The initialisation cannot collide with a starting server.
- The dashboard URL that `RUN.BAT` opens actually loads.
- The frontend can authenticate against a `RUN.BAT`-started backend.
- A password changed by hand later is never overwritten.

## Context

The first attempt (in [[TB-0004 Build the server-rendered TrailBase frontend]]) started the server,
waited for `traildepot/data/main.db` to appear, then ran `trail user change-password` — a **second
`trail` process while the first was still initialising the same depot**. On the user's first run the
server ended up alive with no listening socket, and the dashboard was unreachable. Two further
defects surfaced while diagnosing it: `RUN.BAT` opened `http://127.0.0.1:4000`, which the default
IPv6-only bind can never serve ([[Issue — TrailBase binds IPv6 loopback by default]]), and
`frontend-ssr`'s `TRAILBASE_URL=http://127.0.0.1:4000` had the same problem.

The user proposed stopping and restarting the server around the password change. That removes the
concurrency, but needs a PID to stop (batch cannot get one from `start`) plus a readiness poll.

## Work log

1. Measured the CLI surface: `trail user change-password <user> <password>`, `--address` default
   `localhost:4000`.
2. Found that `user change-password` against a depot directory that does not exist yet **initialises
   the depot** and sets the password — and that against an *initialised* depot it exits `1` for an
   unknown user (so it never invents users).
3. Verified the CLI-first path on a fresh depot with this repo's real `config.textproto` and
   migration (9/9 checks): depot created, our config and migration untouched and used (no default
   scaffold generated), admin created, password set, server then started and logged in with it.
4. Discovered the IPv6-only default bind and that `127.0.0.1:4000` is unreachable, which also
   invalidated the dashboard URL the script had always used.
5. Rewrote `trailbase/RUN.BAT`: CLI-first depot init, explicit `--address=127.0.0.1:4000`, no marker
   file, no readiness polling, no second process.
6. Drove the result in the real Chrome: logged into the TrailBase admin **and** the frontend, walked
   the dashboard, a report and a management screen.
7. Executed `RUN.BAT` itself against a fresh scratch depot and hardened it from what that showed: the
   start path now waits for the listener on `%ADDRESS%` (via `netstat`) before opening the dashboard,
   and warns instead of opening an unreachable tab when the server never comes up — the precise
   failure that started this task. (Testing lesson, harness-side only: passing `set "DEPOT=..."`
   inside a `cmd /c` string invoked from a POSIX shell gets mangled; the script reads the variable
   from the environment correctly, and its own override comment shows the correct cmd form.)

## Verification

- Fresh-depot CLI-first, with our config + migration: 9/9 checks — CLI exit 0; `data/` created;
  `config.textproto` unchanged; our migration still the only one; server then logged in with the
  fixed password; `party_types` returned `customer` + `supplier` (proving our schema, not a default
  - `RUN.BAT` run end to end against a fresh scratch depot (through its `DEPOT` override): it printed
    the first-run line, set the password, started the server, waited for the listener and opened the
    dashboard. The scratch depot gained a full TrailBase layout; `config.textproto` was byte-identical
    afterwards (sha unchanged, so no default scaffold was generated); `data/` was created; and the fixed
    password logged in `200`.
  - Real-browser checks in the same session confirmed the bind fix:
  - backend `http://127.0.0.1:4000/_/admin/` → logged in as `admin@localhost`, **24 tables**, v0.33.22;
  - frontend `http://127.0.0.1:3100/` → logged in, dashboard rendered, `/reports/stockreport` rendered
    the empty state with a `0.00` total, `/management/parties` rendered every relation/enum field;
  - no console errors or warnings on the frontend.
- Not exercised: the management create/update/delete write path against the real depot (deliberately —
  it would have seeded the user's empty scaffold); the write path is covered by `npm run smoke`'s
  scratch-depot suite.

## Related

- [[Issue — TrailBase binds IPv6 loopback by default]]
- [[Backend — TrailBase Server]]
- [[Work Session — TrailBase First Run — 2026-09-25]]
- [[Checkpoint — TrailBase First Run — 2026-09-25]]
