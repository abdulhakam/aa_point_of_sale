---
title: "Logout did nothing — it redirected to a 404 and never cleared the cookies"
type: issue
status: fixed
severity: major
created: 2026-10-11
updated: 2026-10-11
tags: [auth, logout, session, cookies, guest, security]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[api-contract-trailbase]]", "[[tb-0036-htmx-navigation]]"]
---

# Logout did nothing — it redirected to a 404 and never cleared the cookies

**Status:** fixed 2026-10-11. Reported by the owner while the app was temporarily hosted for remote
testing: logging out left the session live.

## Symptom

Clicking **Logout** in the rail (or hitting `/logout`) returned the user to the app still signed in.
Reproduced: after `POST /logout`, `GET /dashboard` still answered **200**, and the `auth_token` /
`refresh_token` cookies were unchanged.

## Cause

`app/ahscripts/routes/logout/route.ts` answered
`{ redirect: "/_/auth/logout", status: 303 }`. That path **does not exist** on this server
(`GET /_/auth/logout` → **404**). Nothing cleared anything, so the cookies set at login survived and
the session stayed valid.

The deeper reason it could not just "hand off to the host": the app's own `/login` route sets the
`auth_token` and `refresh_token` cookies **itself**, from TrailBase's JSON login (`POST
/api/auth/v1/login`), rather than using a host form flow that would set and later clear them. So only
the app can clear them.

## Fix

`logout/route.ts` now:

- reads `refresh_token` from the request cookie and calls the host's JSON logout,
  `POST /api/auth/v1/logout` with body `{ "refresh_token": "…" }` (verified **200**; it revokes the
  refresh token and returns **no** cookies of its own) — best-effort, so a failure still logs out;
- always answers **303 → /login** with `Set-Cookie` clearing both cookies
  (`auth_token=; … Max-Age=0`, `refresh_token=; … Max-Age=0`, same `Path=/; HttpOnly; SameSite=Strict`
  the login set).

Both `GET` and `POST` are handled (the rail is a POST form; a bare link is a GET).

## Evidence

Verified 2026-10-11 against the local server: `POST /logout` → **303, Location `/login`**, with
`Set-Cookie` clearing both cookies; `GET /dashboard` immediately after → **303
`/login?next=%2Fdashboard`**. `GET /logout` behaves the same. `route-snapshot` 50 routes / 0 erroring.

## Not done

The access token is left to expire (1 h); only the refresh token is revoked server-side. Acceptable for
a browser logout, but a server-side session list would let the access token be cut immediately.
