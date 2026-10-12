---
title: The bind default is loopback only
type: decision
status: accepted
decided_on: 2026-10-12
created: 2026-10-12
tags: [deployment, networking, trailbase, run-bat, security, loopback]
belongs_to: "[[aa-point-of-sale]]"
related_to: ["[[serve-the-app-on-all-interfaces]]", "[[offline-local-deployment]]", "[[trailbase-ipv6-loopback-default-bind]]", "[[environment]]", "[[build-batch-scripts-defects-2026-10-12]]"]
---

# The bind default is loopback only

## Decision

`trailbase/RUN.BAT` defaults to `ADDRESS=127.0.0.1:4000` — this machine only. The
app is widened to the LAN deliberately, per start, with:

```bat
set "ADDRESS=0.0.0.0:4000" && trailbase\RUN.BAT
```

An already-set `ADDRESS` is always honoured (the default is a guarded
`if not defined ADDRESS set …`).

## Why this reverses [[serve-the-app-on-all-interfaces]]

That decision (2026-10-02) made `0.0.0.0:4000` the *default* so a second device on
the shop LAN could reach the app without remembering anything. Its own
"to go back to loopback" section already assumed loopback was the safe fallback.

The same safety reasoning applies to making loopback the default again: this is a
production point-of-sale whose single `trail` server serves both the record APIs
and the whole app on one origin [[runtime-js-guest-platform]], so whoever can
reach the port can log in and read or write the ledger. A default that exposes it
to the `192.168.86.0/24` segment is the more surprising choice for a machine that
usually does not need it; widening is one line when it is needed.

A complication is on record: commit `e379f4d` (2026-10-10) had already changed the
default to `127.0.0.1` in the code, but did it wrong — an unconditional `set` that
also broke the documented override and made the file's own header and `README.md`
wrong ([[build-batch-scripts-defects-2026-10-12]], defect 1). So the code was
loopback-only while every document claimed `0.0.0.0`. This decision makes the
loopback default the *intended*, correctly-implemented one and updates the
documents to match.

## Consequences

**Accepted**

- A fresh `RUN.BAT` is not reachable from another device until the operator opts
  in with `ADDRESS=0.0.0.0:4000`.
- The env override works again, so the readiness probe (`netstat … findstr
  %ADDRESS%`) and the bind always agree [[trailbase-ipv6-loopback-default-bind]].

**Given up / still open**

- A shop that runs the app from a second machine must remember the one-line
  override on each start (or bake it into a wrapper). The Windows Defender
  inbound rule for TCP 4000 from [[serve-the-app-on-all-interfaces]] is still
  needed for LAN clients.

## Evidence

- `trailbase/RUN.BAT` — the changed address block and the `netstat` readiness poll.
- `trailbase/README.md` — the quick-start paragraph, updated in the same change.
- `vault/references/environment.md` § *Ports* — updated in the same change.
- Commit `e379f4d` — the earlier, broken loopback change.
- [[serve-the-app-on-all-interfaces]] § *Measured on 2026-10-02* — the LAN-reach
  measurements that still hold when the override is used.

## Related

- [[serve-the-app-on-all-interfaces]] — the reversed decision.
- [[offline-local-deployment]] — the original loopback stance.
