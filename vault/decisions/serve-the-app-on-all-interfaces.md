---
title: Serve the app on all interfaces so other devices on the LAN can use it
type: decision
status: accepted
decided_on: 2026-10-02
created: 2026-10-02
tags: [deployment, networking, trailbase, run-bat, firewall, lan]
belongs_to: "[[aa-point-of-sale]]"
related_to: ["[[trailbase]]", "[[offline-local-deployment]]", "[[trailbase-ipv6-loopback-default-bind]]", "[[environment]]"]
---

# Serve the app on all interfaces so other devices on the LAN can use it

## Context

[[offline-local-deployment]] chose loopback everywhere, on the reasoning that a single shop machine
should expose nothing to the network. That reasoning is right for the legacy pair, but the new
system has no separate frontend process — one `trail` server serves the record APIs *and* the guest
app on one origin ([[runtime-js-guest-platform]]) — so a phone or a second machine cannot use it at
all unless that single server binds every interface. The user asked for the app to be reachable
"globally", on 2026-10-02.

## Decision

`trailbase/RUN.BAT` defaults to `ADDRESS=0.0.0.0:4000` instead of `127.0.0.1:4000`, and Windows
Defender Firewall carries an inbound allow rule for TCP 4000.

Two details make this safe enough to leave as the default:

- The bind address is still always passed explicitly, because TrailBase's own default is
  `[::1]:4000` — IPv6 loopback only — which no IPv4 client can reach
  ([[trailbase-ipv6-loopback-default-bind]]). Overriding it is not optional; widening it is.
- The firewall rule is scoped, not open: `Program` = the `trail.exe` path, `Protocol` TCP,
  `LocalPort` 4000, `Profile` Private. It does not open the port for other programs, and it does
  not apply on a Public profile.

The legacy pair (`backend/` + `frontend/`, PocketBase `:8090` and Next.js `:3000`) is **not**
included — it was not running and is still loopback-only.

## Measured on 2026-10-02

Starting `trail --depot=traildepot run --address=0.0.0.0:4000 --runtime-threads=4` from
`trailbase/` and probing this machine at its Ethernet address `192.168.86.164`:

| Check | Result |
|---|---|
| `Get-NetTCPConnection -State Listen` on 4000 | `0.0.0.0:4000`, owned by `trail.exe` |
| `GET http://192.168.86.164:4000/` | `200` |
| `GET http://192.168.86.164:4000/_/admin/` | `200` |
| `POST http://192.168.86.164:4000/login` (form email + password) | `303` → `/dashboard`, `Set-Cookie: auth_token=…; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600` |
| `GET http://192.168.86.164:4000/dashboard` with that cookie | `200`, `<title>Dashboard · SAMPLE TRADERS</title>` |

Auth survives the widening without any config change: the login handler builds the cookie without a
`Domain` and without `Secure` (`trailbase/runtime/ahscripts/routes/_app/route.ts`, the `attrs`
string in the `POST /login` branch), so the cookie is host-only and is accepted over plain HTTP from
another device. `config.textproto`'s `site_url: "http://localhost:4000"` therefore does not need to
change for LAN access — it is still the placeholder it is documented to be, used for email links and
OAuth redirects ([[offline-local-deployment]], and the open item in
[[pos-0027-migrate-production-data-to-trailbase]]).

## The firewall prompt never arrived

`Get-NetFirewallProfile` reports `NotifyOnListen = True` on all three profiles, yet restarting
`trail.exe` produced **no** Windows Security Alert: 60 s of polling
(`Get-NetFirewallRule | Where DisplayName -like '*trail*'`) found no rule at all, and
`Get-NetFirewallApplicationFilter` matched no `trail` program path either. So on this machine the
inbound rule cannot be relied on to be offered interactively — it was created explicitly instead,
which needs one UAC consent. The rule in place:

```text
DisplayName  : TrailBase aa_point_of_sale 4000 (temp internet test)
Direction    : Inbound     Action: Allow     Profile: Private     Enabled: True
LocalPort    : 4000        Protocol: TCP    Program: C:\Users\wajiz.pk\instl\trailbase\trail.exe
```

Its display name says "temp internet test" because it was written for the
[[trailbase-ipv6-loopback-default-bind]] investigation. The name is now misleading — nothing about
it is temporary or internet-facing — so renaming it is a pending cosmetic item.

## Consequences

**Accepted**

- Any device on the same `192.168.86.0/24` segment can open the app and log in.
- Serving on all interfaces stays the default, so a fresh `RUN.BAT` on the shop machine is
  LAN-reachable without remembering anything.

**Given up / still open**

- **Not internet-reachable.** "Global" here means every *interface*, not the internet. External
  access additionally needs the router to forward TCP 4000 to `192.168.86.164`, which was not
  touched. If that forwarding is added, re-scope the rule deliberately first — `RemoteAddress
  Any` over a Private profile with a router forward is an open app on the LAN's WAN side, and the
  app's own ACLs are the only thing behind it.
- **The rule follows the profile, not the adapter.** `Ethernet` is categorised **Private** and is
  the only connected adapter (`Wi-Fi 2` is disconnected). Move the machine onto a Wi-Fi network
  categorised Public and LAN clients are blocked again, with no error on the server.
- **Every port on `0.0.0.0` is exposed to the segment**, not just 4000, if another process on this
  machine binds widely. The firewall rule narrows that only for `trail.exe`.
- **Not unattended-boot.** The server was started by hand, not registered as a Windows service, so
  it does not come back by itself after a reboot.

**To go back to loopback**

```bat
set "ADDRESS=127.0.0.1:4000" && trailbase\RUN.BAT
Remove-NetFirewallRule -DisplayName "TrailBase aa_point_of_sale 4000 (temp internet test)"
```

## Evidence

- `trailbase/RUN.BAT` — the `ADDRESS` default and the comment explaining both the IPv6-loopback
  trap and the firewall requirement.
- `trailbase/README.md` — the quick-start paragraph, updated in the same change to name `0.0.0.0`
  and the firewall rule.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — the `POST /login` branch: the server-to-self
  `http.postJson(origin + "/api/auth/v1/login")` call and the two host-only cookies.
- `Get-NetFirewallProfile`, `Get-NetFirewallRule`, `Get-NetFirewallApplicationFilter`,
  `Get-NetConnectionProfile` — the measurements quoted above.