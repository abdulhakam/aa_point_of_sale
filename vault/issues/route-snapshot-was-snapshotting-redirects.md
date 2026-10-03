---
title: route-snapshot.mjs was snapshotting redirects, not routes
type: issue
status: fixed
severity: high
created: 2026-10-03
updated: 2026-10-03
tags: [harness, verification, auth, route-snapshot, false-pass, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0030-retire-the-route-ts-dispatcher]]", "[[tb-0032-manifest-first-refactor]]", "[[build-and-run]]", "[[settle-structural-claims-with-the-owning-artifact]]"]
---

# route-snapshot.mjs was snapshotting redirects, not routes

**Found and fixed 2026-10-03. Systemic — five tools had it, not one.**

> **Update, later the same day.** The same defect was then found in
> **`tools/write-paths-check.mjs`** (reported 6 failures out of 7; now **13 of 13** pass) and in
> **`management-check.mjs`**, **`invoice-check.mjs`**, **`invoice-doc-check.mjs`** and
> **`id-codec-check.mjs`** — none of which had ever authenticated either. All five fixed. It is one
> defect copied tool to tool, so what follows is the general case rather than a story about one file.
>
> The two tools that carried a `check("login", Boolean(cookie))` assertion reported it as a *failing
> check*, which reads as "the app is broken" rather than "this harness never logged in". That is why it
> survived, and it is the more general lesson: **a harness defect that presents as an application defect
> will be investigated as an application defect.**

The route-parity gate — the one [[tb-0030-retire-the-route-ts-dispatcher]] and
[[tb-0032-manifest-first-refactor]] are gated on — could not fail. It reported
**"45 routes, 0 erroring"** while testing nothing but redirects to `/login`.

## The defect

`trailbase/tools/route-snapshot.mjs` logged in with:

```js
const login = await fetch(`${BASE}/api/auth/v1/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email_or_username: EMAIL, password: PASSWORD }),
});
```

**No `redirect: 'manual'`.** TrailBase answers a successful login with a **303** to `/login`, and
`Set-Cookie` on that 303. With the default redirect-following behaviour, `fetch` returns the
*followed* response: the `/login` HTML page, whose headers contain no `Set-Cookie`. So
`remember(res)` stored an empty cookie string, every subsequent request went out with no `cookie`
header, and every app route answered **303 → /login**.

`guest-smoke.mjs` passes `redirect: "manual"` on exactly this call
(`trailbase/tools/guest-smoke.mjs:205`). The snapshot tool did not.

### Why nothing caught it

Two independent reasons, and the second is the important one:

1. **The tool said it worked.** `login.ok` was `true` — a 303-to-an-HTML-page is still `ok` — so it
   printed `logged in as admin@localhost` and carried on.
2. **The output looked healthy.** 45 rows, no `ERR`, no `500`, `0 erroring`. A 303 is a perfectly
   ordinary status for an *authenticated* route, and the tool has separate `303 not-a-route` and
   `303 anonymous-redirect` entries in its own route list. So the fingerprint of "broken" was
   indistinguishable from the fingerprint of "correct".

This is the failure mode [[settle-structural-claims-with-the-owning-artifact]] warns about: *"a
harness exited 0" is not the same as "the harness asserted the thing"*. The tool would have reported
an **identical** before/after snapshot across [[tb-0030-retire-the-route-ts-dispatcher]]'s entire
1,821-line dispatcher split — which is precisely the class of change the gate exists to catch.

## The fix

Three changes in `trailbase/tools/route-snapshot.mjs`:

1. `redirect: 'manual'` on the login, so the response carrying `Set-Cookie` is the one inspected.
2. The success test is now the **status and the cookie**, not `res.ok`. A successful TrailBase login
   is `303`, so `res.ok` was both the wrong predicate *and* silent about the real failure:
   ```js
   if (login.status !== 303 && login.status !== 200) { /* fail with the status */ }
   remember(login);
   if (!cookie) { /* fail loudly */ }
   ```
   The second guard is the important one: a login that sets no cookie now exits `1` instead of
   snapshotting 45 redirects.
3. **`/reports/stock` → `/reports/stockreport`.** The tool probed `/reports/stock`, which is not a
   route. It faithfully recorded `404 report stock`, which reads like a broken screen and is
   actually a correct answer to a question nobody asked. The Stock Report was therefore **not
   covered by the gate at all**, while the gate's name suggested it was.

While fixing the third item, four genuinely-missing routes were added so the snapshot covers the 14
report and ledger pages the gates name: `report productsale`, `ledger area`, `ledger booker`,
`ledger party`. The tool went from **45 to 49 routes**.

## Evidence

Before, on a correctly-authenticated depot:

```text
logged in as admin@localhost
200  healthz          21ms
200  login            26ms
303  dashboard        21ms      <- redirect to /login, not a rendered screen
303  report profit    22ms
... 40 more 303s ...
45 routes, 0 erroring after 2 retries
```

After:

```text
logged in as admin@localhost (303, cookie set)
200  dashboard         32ms  html title="Dashboard · SAMPLE TRADERS" links=12
200  report profit    102ms  html tr=3 fields=9 title="Profit Report · SAMPLE TRADERS"
200  report stock     128ms  html tr=3 fields=1 title="Stock Report · SAMPLE TRADERS"
200  report productsale 118ms html tr=3 fields=5
200  ledger general    84ms  html tr=5 fields=5
200  ledger area      137ms  html tr=5 fields=4
200  ledger booker     98ms  html tr=0 fields=3
200  ledger party      92ms  html tr=0 fields=3
...
49 routes, 0 erroring after 2 retries
```

Every one of the 14 report and ledger pages now answers **200** with a real title, row count and
field count. The `404` entries that remain are the tool's own deliberate negative probes
(`report unknown`, `management unknown`, `page unknown`, `jobs unknown`, `not found`) and are
correct.

## What this means for the plan

- **A real baseline now exists.** [[tb-0032-manifest-first-refactor]] and
  [[tb-0030-retire-the-route-ts-dispatcher]] are gated on "route snapshot unchanged". That gate was
  previously unfalsifiable; the corrected baseline is `.kilo/route-snapshot-baseline.txt` at 49
  routes. Take a fresh baseline in the same environment before starting either refactor — a
  fingerprint diff across two different depots is meaningless.
- **⚠️ The gate needs a depot whose admin password you have.** The production depot's password is
  **not** the documented `administrator-0ne` default (a login with it returns `400`), so
  `route-snapshot.mjs` cannot currently be pointed at `traildepot/` on `:4000`. It needs either the
  real password or a throw-away depot built like `guest-smoke.mjs` builds on `:4322`. The baseline
  quoted above was taken against such a depot.

## Related

- [[build-and-run]] — how to run each harness and against which depot.
- [[settle-structural-claims-with-the-owning-artifact]] — the rule this defect is an instance of.