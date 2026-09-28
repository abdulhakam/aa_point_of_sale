---
title: Deploy locally and offline, as single-file SQLite servers
type: decision
status: accepted
decided_on: 2026-09-19
created: 2026-09-26
tags: [deployment, offline, desktop, sqlite, standalone]
belongs_to: "[[aa-point-of-sale]]"
related_to: ["[[backend]]", "[[frontend]]", "[[trailbase]]"]
---

# Deploy locally and offline, as single-file SQLite servers

## Context

The application runs a real distribution business on a local machine, not in a data centre. That
constrains every layer:

- The business must keep operating when the internet is down, so there is no managed database, no
  hosted auth, and no CDN-dependent asset pipeline.
- A shop machine is not administered by a platform team, so "install" has to mean "copy a folder
  and run a `.BAT`", and a backup has to mean "copy a file".
- There is no separate operations budget for certificates, containers or a reverse proxy.

## Decision

Every layer is a **self-hosted, single-file, dependency-light** component that runs on the same
machine as the user:

| Layer | Choice | Consequence |
|---|---|---|
| Legacy database | PocketBase: one 44 MB `pocketbase.exe` + a `pb_data/` directory | backup = copy the directory |
| New database | TrailBase: one `trail` binary + a `traildepot/` directory | backup = copy the depot; SQLite underneath |
| Legacy frontend | Next.js with `output: 'standalone'` and a `build:standalone` script that `robocopy`s into `../standalone` | copy the folder and run it |
| New frontend | The guest-WASM frontend ([[runtime-js-guest-platform]]), served by the `trail` binary itself | copy the depot and its `wasm/` component; no separate process or install |
| Auth | each server's own built-in user table; no external identity provider | TrailBase: email + password, ≥ 8 chars, no OTP (OTP needs SMTP) |
| Assets | fonts/CSS/JS self-hosted; `images: { unoptimized: true }` | no external requests on page load |
| Deployment scripts | `.BAT` files, not CI | `backend\DEV.BAT`, `backend\RUN NEXTJS.BAT`, `trailbase\RUN.BAT` |

Two design choices follow directly and are recorded elsewhere:

- **Everything binds loopback** (`127.0.0.1`), so nothing is exposed on the network by default.
  This is why `trailbase/RUN.BAT` has to override TrailBase's own `[::1]:4000` default
  ([[trailbase-ipv6-loopback-default-bind]]).
- **The new frontend has no build step and no UI framework** ([[runtime-js-guest-platform]]):
  plain HTML, one stylesheet, and MiniJinja templates read from disk at render time — no bundler.
  On a machine with no build tooling, "no build" is a feature.

## Consequences

**Accepted**

- No network dependency for the application to function; the internet is only needed to install
  the TrailBase binary (`iwr https://trailbase.io/install.ps1 | iex`).
- Backups are file copies. `backend/pb_data/` is a directory; `traildepot/` is a directory.
- SQLite's single-writer model is a non-issue at this concurrency, and its single-file nature is
  what makes the "copy to back up" story true.
- `trailbase/README.md` notes a related detail: `config.textproto`'s `site_url` is a placeholder
  (`http://localhost:4000`) because it is only used for email links and OAuth redirects, neither of
  which this deployment uses. And `traildepot/.gitignore` reserves `static/` for a future
  `--public-dir` bundle, i.e. the same "one folder" instinct.

**Given up**

- No horizontal scaling, no failover, no online migration window. A single-machine application,
  by design.
- Windows-specific entry points (`.BAT`, `netstat` polling, `robocopy`), and a 44 MB binary
  committed to git.
- Session/secret management is TrailBase's own: the guest has no separate process and no
  `SESSION_SECRET`, and `COOKIE_SECURE` is set by hand if HTTPS is ever added ([[environment]]).
- The "packaged build" is not fully unified: `frontend/` has a standalone bundle script but the
  guest frontend has no separate bundle at all (it is served by the `trail` binary), and Storybook
  is a dev-only extra.

## Evidence

- `frontend/next.config.js` — `output: 'standalone'`, `images: { unoptimized: true }`.
- `frontend/package.json` — the `build:standalone` script (`next build` + `robocopy` ×3 into
  `../standalone`) and `serve` (`http-server ./out/ -p 3000`).
- `backend/pocketbase.exe` — 44,842,496 bytes, version 0.22.55, committed.
- `trailbase/.gitignore` / `traildepot/.gitignore` — only `config.textproto` and `migrations/`
  are source; `data/`, `backups/`, `uploads/`, `secrets/`, `wasm/` are runtime state.
- `trailbase/src/config.textproto` — no SMTP, no OAuth, no anonymous or OTP sign-in; everything
  local.
- `trailbase/src/host/src/render.rs` and `trailbase/src/runtime/app/views/` — templates read from disk at render
  time, no bundler.
- The prior vault recorded this as `decisions/offline-local-desktop-deployment.md`, and a related
  investigation into desktop packaging; see [[previous-vault-recovery]].
