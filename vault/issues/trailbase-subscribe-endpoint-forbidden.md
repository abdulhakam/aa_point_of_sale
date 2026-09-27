---
title: TrailBase record subscriptions return 403 — realtime streaming is unavailable here
type: issue
status: verified
severity: medium
created: 2026-09-27
tags: [trailbase, realtime, subscriptions, sse, invoices, limitations]
related_to: ["[[invoice-entry-freshness-and-writes]]", "[[trailbase]]", "[[tb-0021-invoices-cashmemos-printing]]"]
---

# TrailBase record subscriptions return 403 — realtime streaming is unavailable here

## What was tested

The invoice design wanted to use TrailBase's change subscriptions for freshness
([[invoice-entry-freshness-and-writes]]). The endpoint
`GET /api/records/v1/<name>/subscribe/<*|record>` ("Starts streaming changes to matching records
via SSE/WebSocket", `trail v0.33.22`) returns **403 Forbidden** in every form tried, on a table
that reads normally:

| Request | Result |
|---|---|
| `GET /api/records/v1/sections?limit=1` + `auth_token` cookie | **200** |
| `GET /api/records/v1/sections?limit=1` + `Authorization: Bearer …` | **200** |
| `…/sections/subscribe/*` + cookie, `Accept: text/event-stream` | **403**, empty body |
| `…/sections/subscribe/%2A` + cookie | **403** |
| `…/sections/subscribe/<url-encoded id>` + cookie | **403** |
| `…/sections/subscribe/*` + **bearer token** | **403** |
| `…/sections/subscribe/*` + cookie + `Origin: http://localhost:4000` | no response (host exited) |

- No `realtime`/`subscribe`/`subscription` setting exists in `traildepot/config.textproto`, and
  `trail run --help` exposes no such flag.
- A PATCH performed while an SSE client was attached produced **no events** (0 bytes streamed) —
  and the host process then exited, after which the port refused connections. That is consistent
  with the already-recorded `wstd` client-disconnect panic ([[trail-runtime-js-reference]] § Gaps),
  so a dropped stream is itself a crash risk today.

## Impact

- **Realtime push cannot be relied on.** The invoice/cash-memo screens use the design's documented
  **fallback: short-poll the context endpoint with `If-None-Match`** (the guest answers `304`
  cheaply), refetching on focus and after every write — which is what the app's react-query
  predecessor effectively did anyway (60 s staleness + invalidation).
- No change to the write/correctness design: server-side numbering (and, where chosen, locks) are
  what make concurrent tills safe, not the delivery of change events.

## Next, if push is wanted later

- Find how TrailBase enables realtime (a store/`subscriptions` config or a newer build) and whether
  it accepts cookie auth, or drive the official `trailbase` JS client's own handshake.
- Fix the streaming-disconnect panic first; a stream that can crash the host is worse than polling.

## Evidence

- The request/response table above, taken against `trail v0.33.22` on a depot whose `sections`
  list rule is `authenticated`.
- `trail --depot=… openapi print` — the subscribe operation takes only `{name, record}` path params.

## Related

- [[invoice-entry-freshness-and-writes]] — the design whose fallback now applies.
- [[tb-0021-invoices-cashmemos-printing]] — the task.
