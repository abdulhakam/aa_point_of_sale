---
title: The legacy views' filter quotes 400 on two of the shop's screens
type: issue
status: open
created: 2026-10-04
updated: 2026-10-04
tags: [legacy, pocketbase, filter, bug, itemsales, profit, screens]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-cost-on-a-whole-database]]", "[[route-map]]", "[[frontend]]", "[[guest-frontend-feature-parity-gaps]]"]
---

# The legacy views' filter quotes 400 on two of the shop's screens

**Unverified in a browser. Read the caveat before acting on this.**

While replaying what each legacy report fetches, two screens could not be replayed at all: the
Item Sales Report and the Profit Report both begin with a filtered `fullList` of `invoice_view`, and
that request does not succeed against this PocketBase.

## What is in the bundle

`legacyforparity/standalone/.next/server/app/app/reports/profit/page.js`, and the same shape in
`reports/transactions/unified/page.js`:

```js
fullList({collection:"invoice_view", filter:'type = "sale" || type = "return"', expand:""})
```

The filter string is written with **double quotes** around `sale` and `return`.

## What the server does

PocketBase 0.22.55 on this machine, same collection, same request, three forms:

| filter | result |
|---|---|
| `type = "sale" \|\| type = "return"` | **no response** — 400 on some requests, and once hung past 60 s |
| `type = 'sale' \|\| type = 'return'` | **200**, `totalItems` 8,660 (8,606 sale + 54 return) |
| `type != 'purchase'` | **200**, `totalItems` 8,661 |

So the double-quoted form is not accepted, and the single-quoted form returns exactly the 8,660 rows
the reports expect — `invoices.type` in `pb_data` is `sale` 8,606 / `purchase` 266 / `return` 54 /
`difference` 1.

`report-sweep.mjs` now normalises the quotes so the replay can run. That is a **harness** fix and says
nothing about the app.

## Why this is filed as an open issue rather than a finding

Three readings, and the evidence does not choose between them:

1. **The screens are broken in production.** The SDK may send the filter verbatim, in which case the
   Item Sales Report and the Profit Report fail to load their rows. Neither is a screen the shop is
   said to use daily, which is weak support for this reading — but it is also why it would have gone
   unnoticed.
2. **The SDK transforms the filter before sending it.** The PocketBase JS SDK's `getFullList` builds
   the query itself, and `serializeQueryParams` may re-encode the string. In that case the app works
   and only a hand-built request is affected.
3. **The server behaviour is non-deterministic here.** The double-quoted form gave a 400 twice and a
   60 s hang once, which is not a clean rejection and does not settle anything.

**The check that settles it** is to open `/app/reports/profit` in the frozen bundle and read the
network panel: if the request that leaves the browser carries `filter=type = %22sale%22`, reading 1
is correct. That takes a minute and has not been done.

This is [[settle-structural-claims-with-the-owning-artifact]] again, from the other direction — the
evidence collected so far is consistent with a live 400 on two screens, and is also consistent with
nothing being wrong at all. Recorded rather than concluded.

## Related

- [[report-cost-on-a-whole-database]] — the sweep that surfaced it, and the legacy timings.
- [[guest-frontend-feature-parity-gaps]] — what these two screens cost if they are broken.