---
title: TrailBase defaults to the IPv6 loopback and local clients cannot reach it
type: issue
status: fixed
severity: medium
created: 2026-09-26
tags: [trailbase, networking, ipv6, run-bat, gotcha]
related_to: ["[[trailbase]]", "[[environment]]"]
---

# TrailBase defaults to the IPv6 loopback and local clients cannot reach it

## The problem

TrailBase's own default bind address is `[::1]:4000` — **IPv6 loopback only**. Neither of the two
clients in this workspace can reach that:

- a browser opened at `http://127.0.0.1:4000` (or `http://localhost:4000` resolving to IPv4),
- [[frontend-ssr]], whose `TRAILBASE_URL` is `http://127.0.0.1:4000` and which therefore makes
  IPv4 connections only.

The failure mode is unhelpful: the server logs `Listening on http://[::1]:4000` and looks healthy,
while every client gets a connection refused. Nothing in the message says "wrong address family".

## The fix, as shipped

`trailbase/RUN.BAT` binds IPv4 loopback explicitly, and says why in a comment:

```bat
rem IPv4 loopback explicitly. TrailBase defaults to [::1]:4000 (IPv6 only), which a
rem browser at 127.0.0.1 - and the frontend, whose TRAILBASE_URL is
rem http://127.0.0.1:4000 - cannot reach.
if not defined ADDRESS set "ADDRESS=127.0.0.1:4000"
...
start "" trail "--depot=%DEPOT%" run --address=%ADDRESS%
```

The address is overridable (`set "ADDRESS=127.0.0.1:4001" && RUN.BAT`), and it is also what the
BAT file polls for readiness — it waits on
`netstat -a -n -p tcp | findstr "%ADDRESS%" | findstr LISTENING` — so the override keeps the
readiness check and the bind in agreement.

`frontend-ssr/.env.example` carries the same warning, from the client's side:

> NOTE: `trailbase/RUN.BAT` binds TrailBase to 127.0.0.1 explicitly because TrailBase's own default
> is [::1]:4000 (IPv6 only) - a client at 127.0.0.1 cannot reach that. If you start the server
> yourself, pass `--address=127.0.0.1:4000` or point this at `[::1]` instead.

## Still true for manual starts

The fix lives in `RUN.BAT`, not in `config.textproto` — there is no config field for the bind
address; it is a CLI flag. So **a plain `trail --depot=./traildepot run` still binds IPv6-only**,
and the same trap is waiting for anyone who follows the quick-start section of
`trailbase/README.md` instead of using the BAT file. That section does document both
`trail --depot=./traildepot run` and, in the RUN.BAT explanation, why the BAT file differs — but
the warning is two screens below the command.

Worth considering: have `.env.example` default `TRAILBASE_URL` to whatever `RUN.BAT` uses (it does)
*and* add a one-line "if this fails, you probably bound IPv6" to the README's quick start.

## Also related

The `/reports/refresh` control and the readiness polling both depend on the address matching, so a
custom `ADDRESS` on one side and not the other produces a frontend that starts and then reports
errors on every request. [[environment]] lists all four ports for exactly this reason.

## Evidence

- `trailbase/RUN.BAT` — the `ADDRESS` default, the comment block quoted above, and the `netstat`
  polling.
- `frontend-ssr/.env.example` — the client-side note.
- `frontend-ssr/.env` — `TRAILBASE_URL=http://127.0.0.1:4000`.
- `trailbase/README.md` — the `RUN.BAT` explanation ("binds `127.0.0.1:4000` explicitly, because
  TrailBase's own default bind is `[::1]:4000` (IPv6 only)") and the validation line "the server
  reaches `Listening on http://[::1]:4000`", which is the observed default being described.
- The prior vault recorded this as `issues/trailbase-default-bind-ipv6-loopback.md`, and it was
  addressed by `186c61f` ("fix(trailbase): Reliable first run and IPv4 bind"); see
  [[previous-vault-recovery]].
