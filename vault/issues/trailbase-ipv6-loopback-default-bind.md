---
title: TrailBase defaults to the IPv6 loopback and local clients cannot reach it
type: issue
status: fixed
severity: medium
created: 2026-09-26
updated: 2026-10-12
tags: [trailbase, networking, ipv6, run-bat, gotcha]
related_to: ["[[trailbase]]", "[[environment]]", "[[default-bind-is-loopback]]", "[[serve-the-app-on-all-interfaces]]"]
---

# TrailBase defaults to the IPv6 loopback and local clients cannot reach it

## The problem

TrailBase's own default bind address is `[::1]:4000` — **IPv6 loopback only**. A browser opened at
`http://127.0.0.1:4000` (or `http://localhost:4000` resolving to IPv4) cannot reach that.

The former Node frontend (`frontend-ssr`, removed 2026-09-27) could not reach it either: its
`TRAILBASE_URL` was `http://127.0.0.1:4000`, so it made IPv4 connections only. The guest frontend
has no such client — it is served by TrailBase itself on the same origin
([[guest-app-host-port]]) — so the browser is the only client affected today.

The failure mode is unhelpful: the server logs `Listening on http://[::1]:4000` and looks healthy,
while every client gets a connection refused. Nothing in the message says "wrong address family".

## The fix, as shipped

> **Corrected 2026-10-02.** The upstream trap below is unchanged and still needs an explicit
> address, but `RUN.BAT`'s default is now `ADDRESS=0.0.0.0:4000`, not `127.0.0.1:4000`, so the app
> is reachable from other devices on the LAN — see [[serve-the-app-on-all-interfaces]]. The comment
> this section quoted, and the `trailbase/README.md` sentence that repeats it, have both been
> rewritten to match. The rest of this note still stands.
>
> **Corrected again 2026-10-12.** The default is **loopback only** again
> (`ADDRESS=127.0.0.1:4000`); serving the LAN is now an explicit per-start override
> (`set "ADDRESS=0.0.0.0:4000" && RUN.BAT`). See [[default-bind-is-loopback]]. Note the
> 2026-10-02 sentence above described the *documented* state, not the code: commit `e379f4d`
> (2026-10-10) had already set the code to `127.0.0.1`, but with an unconditional `set` that also
> broke the override — [[build-batch-scripts-defects-2026-10-12]], defect 1.

`trailbase/RUN.BAT` always passes `--address`, and says why in a comment:

```bat
rem Always give the bind address: TrailBase defaults to [::1]:4000 (IPv6 loopback only),
rem which neither a browser at 127.0.0.1 nor one at this machine's LAN address can reach.
rem The default is loopback only. To serve other devices on the LAN a caller sets 0.0.0.0:4000
rem before starting (set "ADDRESS=0.0.0.0:4000" && RUN.BAT). The guard matters: setting ADDRESS
rem unconditionally would discard the caller's value instead of honouring it.
rem Inbound TCP 4000 also has to be allowed in Windows Defender Firewall for LAN clients.
if not defined ADDRESS set "ADDRESS=127.0.0.1:4000"
...
start "" trail "--depot=%DEPOT%" run --address=%ADDRESS%
```

That comment's "frontend ... TRAILBASE_URL" phrasing predates the guest platform, where the app is
served by TrailBase itself ([[guest-app-host-port]]); the bind it documents is unchanged.

The address is overridable (`set "ADDRESS=0.0.0.0:4000" && RUN.BAT` to widen, or
`set "ADDRESS=127.0.0.1:4001"` for a different loopback port), and it is also what the
BAT file polls for readiness — it waits on
`netstat -a -n -p tcp | findstr "%ADDRESS%" | findstr LISTENING` — so the override keeps the
readiness check and the bind in agreement.

The removed Node frontend's `.env.example` carried the same warning, from the client's side
(historical, removed 2026-09-27):

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

Worth considering: add a one-line "if this fails, you probably bound IPv6" next to the
`trail --depot=./traildepot run` command in the README's quick start.

## Also related

The `/reports/refresh` control and the readiness polling both depend on the address matching, so a
custom `ADDRESS` on one side and not the other produces a guest frontend that starts and then
answers errors to every request from the mismatched client. [[environment]] lists all four ports
for exactly this reason.

## Evidence

- `trailbase/RUN.BAT` — the `ADDRESS` default, the comment block quoted above, and the `netstat`
  polling.
- The removed Node frontend's `.env.example` and `.env` (`TRAILBASE_URL=http://127.0.0.1:4000`)
  held the client-side note; both went with `frontend-ssr` on 2026-09-27.
- `trailbase/README.md` — the `RUN.BAT` explanation ("binds `127.0.0.1:4000` explicitly, because
  TrailBase's own default bind is `[::1]:4000` (IPv6 only)") and the validation line "the server
  reaches `Listening on http://[::1]:4000`", which is the observed default being described.
- The prior vault recorded this as `issues/trailbase-default-bind-ipv6-loopback.md`, and it was
  addressed by `186c61f` ("fix(trailbase): Reliable first run and IPv4 bind"); see
  [[previous-vault-recovery]].
