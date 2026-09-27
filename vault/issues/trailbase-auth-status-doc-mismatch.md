---
title: The unauthenticated status code is documented as 401 but measured as 403
type: issue
status: open
severity: low
created: 2026-09-26
tags: [trailbase, docs, auth, status-codes, inconsistency]
related_to: ["[[trailbase]]", "[[api-contract-trailbase]]"]
---

# The unauthenticated status code is documented as 401 but measured as 403

## The inconsistency

Two places in the same repository state the opposite thing about the same behaviour:

| Source | Claim |
|---|---|
| `trailbase/README.md`, § *Access control* | "An unauthenticated request is answered with **403** (no permission), not 401." |
| `traildepot/config.textproto`, the `record_apis` comment block | "Nothing here is public: an unauthenticated request gets **401**." |
| The former Node frontend's `src/lib/trailbase.js` (removed 2026-09-27), verified-behaviour header | "Unauthenticated requests are answered `403`." |

So two sources say **403** (including the one that records it as *measured*), and the configuration
file — the file a developer reads while editing permissions — says **401**.

## Which is right

**403.** The `README` records it as a verified observation, and the former Node client's header
(`frontend-ssr`, removed 2026-09-27) listed it among behaviours verified against a running server
on `v0.33.22`:

> unauthenticated `GET /api/records/v1/items` and `…/party_types/schema` return `403` with the
> shipped authenticated-only config.

Both statements are backed by an actual request against a running server; the `config.textproto`
comment is prose that was written alongside the configuration and never re-checked against a
response.

## Why it matters

- **It is a misleading hint at the exact moment it is least affordable.** Someone deliberately
  opening an API up (`acl_world: [READ]`) or debugging why a client cannot authenticate is looking at
  that comment block, and 401 vs 403 is the difference between "you are not logged in" and "you are
  logged in and still not allowed". Chasing the wrong one wastes the debugging session.
- Client code branches on the status: a 401 conventionally means *re-authenticate*, a 403 means
  *do not retry*. A client that follows the comment would attempt a token refresh on a permission
  failure, which cannot help.
- It is a small, self-inflicted inconsistency in an otherwise carefully evidenced repository, and
  the vault's conventions ask for measured claims over asserted ones ([[vault-guide]]).

## Fix

Change the `config.textproto` comment from "401" to "403", ideally phrased as the measured behaviour
rather than a general rule — e.g. "an unauthenticated request is answered 403 (no permission), not
401" — matching the README.

While there, note that `acl_world` is the documented escape hatch for deliberately public APIs and
that `SCHEMA` is granted to authenticated users, both of which are already stated nearby.

## Not a behavioural problem

Nothing in the current tree depends on the wrong number. The guest frontend reads the depot SQLite
directly and writes through SQL ([[runtime-js-guest-platform]]), so it does not branch on TrailBase
record-API status codes at all. In the former Node frontend (`frontend-ssr`, removed 2026-09-27),
`TrailBaseError` carried whatever status it received and `trailbaseErrorHandler` rendered any
TrailBase failure as a page regardless of code. So this is a documentation defect with a real (if
bounded) cost, not a bug that can corrupt state.

## Evidence

- `trailbase/README.md` § *Access control* — "An unauthenticated request is answered **403** (no
  permission), not 401." and § *Validation* — "unauthenticated `GET /api/records/v1/items` and
  `…/party_types/schema` return `403` with the shipped authenticated-only config."
- `traildepot/config.textproto` lines ~56–59 — "NOTE: the old PocketBase collection rules were `""`,
  i.e. world-accessible. Nothing here is public: an unauthenticated request gets 401."
- The former Node frontend's `src/lib/trailbase.js` (removed 2026-09-27) — the header comment
  "Unauthenticated requests are answered `403`."
- The former Node frontend's `src/lib/http.js` (removed 2026-09-27) — `trailbaseErrorHandler`,
  which was status-agnostic. The guest's `runtime-js/site/app/lib/http.js` is a small
  page/query-string helper and has no TrailBase error path.
