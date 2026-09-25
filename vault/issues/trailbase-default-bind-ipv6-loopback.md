---
type: Issue
status: Open
created: 2026-09-25
updated: 2026-09-25
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0005 Fix the first-run admin password and the backend bind]]"
affects:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — TrailBase Server-Rendered App]]"
tags:
  - trailbase
  - networking
  - gotcha
---

# Issue — TrailBase binds IPv6 loopback by default

## Summary

`trail run` without `--address` binds `localhost:4000`, which on this machine resolves to
**`[::1]:4000` — IPv6 loopback only**. Anything addressed to `127.0.0.1:4000` (IPv4) is refused, even
though the server is healthy and serving.

## Evidence

- A throw-away depot started with `trail --depot=<d> run` logs `Listening on http://[::1]:4000 🚀`.
- Against that server: `POST http://127.0.0.1:4000/api/auth/v1/login` → connection failed (`fetch failed`);
  the same request to `http://[::1]:4000/...` → `200`.
- `trail run --help` states the default: `[default: localhost:4000]`.
- `netstat -a -n -o -p tcp` shows the listener on `[::1]:4000` and nothing on `127.0.0.1:4000`.

## Impact

Two real failures, both from assuming the default bind:

- `trailbase/RUN.BAT` opened `http://127.0.0.1:4000/_/admin/`, which could **never** load — the
  "This site can't be reached" page users see is this, not a crashed server.
- `frontend-ssr` ships `TRAILBASE_URL=http://127.0.0.1:4000`, so its login and every report request
  would have failed against a default-configured backend.

Pointing a client at `localhost` instead is not a safe fix either: Node resolves `localhost` in DNS
order (verbatim), so it may pick `::1` for an IPv4-only server and fail the other way.

## Mitigation

- `trailbase/RUN.BAT` starts the server with `--address=127.0.0.1:4000` and opens the dashboard at
  that same address, so both sides agree and neither depends on name resolution.
- `frontend-ssr/.env.example` documents the requirement, and the frontend's default
  `http://127.0.0.1:4000` is now correct given RUN.BAT's explicit bind.
- Verified end to end in a real browser: dashboard on `127.0.0.1:4000` after a `RUN.BAT`-style start.

## Notes

Binding to loopback is a reasonable default; the mistake was on our side, not upstream. The upstream
behaviour is unchanged, so this stays open as a known gotcha — mitigated in our launchers and recorded
so the next TrailBase client does not rediscover it. Use an explicit `--address` in every launcher.
