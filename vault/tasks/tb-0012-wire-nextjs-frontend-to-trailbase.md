---
title: TB-0012 Wire a client to TrailBase
type: task
status: todo
priority: high
created: 2026-09-26
tags: [trailbase, frontend, client, migration, api]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-client-side-migration-plugin]]", "[[api-contract-trailbase]]"]
---

# TB-0012 Wire a client to TrailBase

Give one of the two UIs a TrailBase data layer, so the new backend stops being reachable only from
the guest frontend ([[runtime-js-guest-platform]]).

Two shapes are available and [[pos-0028-decide-cutover-plan]] chooses between them. This task is the
implementation either way.

## Why it is not already done

`trailbase/README.md`, § *Follow-ups* item 1:

> Wire the frontend to this server: the `frontend/src/app/api/*` layer and its `useAPI.ts` helpers
> are PocketBase-shaped (`pb.collection(...)`, `filter: 'a = "b" && c = 1'`, `expand`, `getFullList`).
> They need a TrailBase client (`trailbase` npm package) or a thin adapter shim.

So the blocker is a contract mismatch, not a missing backend. Everything the client needs exists.

## The mismatch, concretely

| Concern | PocketBase (today) | TrailBase |
|---|---|---|
| List everything | `getFullList()` | `?limit=` + cursor loop (`listAll`) |
| List a page | `getList(page, perPage)` | `?limit=50&offset=…` or `?cursor=` |
| Sort | `sort: '-created'` | `order: '-created'` |
| Filter | `filter: 'a = "b" && c = 1'` | `filter[a][$eq]=b` + `filter[c][$eq]=1` |
| Expand | `expand: 'party.area.section'` (nested) | `expand=party` — **one hop**, allow-listed |
| Enum values | text (`sale`, `customer`) | integers (`1`, `0`); `NULL` = unset, `0` is real |
| Booleans | `true` / `false` | `1` / `0` |
| Delete result | JSON / void | plain text `deleted` — must tolerate ([[trailbase-delete-returns-plain-text]]) |
| Writes of a relation | the record id | **canonical UUID text**, while reads return base64 |
| Multi-valued relation | `company` array + `company~"<id>"` filter | link table rows; no JSON-membership filter |
| Aggregates | SQL views (`payments_view`, …) | none — client computes ([[trailbase-drop-sql-views]]) |

## Option A — adapter behind the existing API surface

Keep `useAPI.ts`'s exported names and have them talk to TrailBase. The codebase already leans this
way: `hydrateRefs` exists specifically to synthesise the `expand` shapes that render code expects, and
`crud.listPage` already separates paginated from full-list reads.

```text
src/app/api/trailbase.js        # thin client: listPage/listAll/count/getOne/create/update/remove
src/app/api/useAPI.ts           # same exports, TrailBase implementation
src/app/api/pocketbase.js       # kept only for the auth/session path, or removed
```

- ✅ Minimal churn at call sites; `hydrateRefs(rows, maps, relations)` keeps `row.expand?...` working.
- ✅ The `pocketbase-types.ts` record types stay usable for the base tables.
- ❌ Every query string in the app has to be rewritten (filters, sorts, expands) — the adapters
  cannot translate a PocketBase filter expression reliably.
- ❌ The view-shaped types (`PaymentsViewRecord`, …) have no TrailBase source; see
  [[tb-0013-rework-report-screens-without-views]].

## Option B — treat the guest app as the client

Retire the Next.js POS UI and build the missing screens on [[runtime-js-guest-platform]] instead.

- ✅ No adapter, no filter translation, no second UI stack ([[keep-legacy-stack-in-production]] ends).
- ✅ The server already aggregates and caches ([[trailbase-incremental-report-refresh]]).
- ❌ Everything in [[guest-frontend-feature-parity-gaps]] must be built first — invoicing, printing,
  cash memo, expenses, orders.

## Subtasks

- [ ] Record which option [[pos-0028-decide-cutover-plan]] chose, and supersede this task if it is B
- [ ] Write the client: `trailbase.js` with `listPage` / `listAll` / `count` / `getOne` / `create` /
      `update` / `remove` / `schema`, per the contract in [[api-contract-trailbase]] — the guest
      frontend reads the depot's SQLite directly and has no record-API client to copy
      ([[runtime-js-guest-platform]])
- [ ] Handle the four encoding traps: base64 reads vs UUID writes, plain-text delete, `0`/`1`
      booleans, integer enum codes (`0` is valid — never branch on truthiness)
- [ ] Rewrite every PocketBase `filter:` expression as `filter[col][$op]=` parameters, and check each
      one for a JSON-membership use that has no equivalent ([[trailbase-link-tables-over-json]])
- [ ] Replace every nested `expand:` with one hop plus a client-side resolve, reusing `hydrateRefs`
- [ ] Switch `getFullList` callers to `listAll`/`listPage`; confirm nothing still fetches a whole
      report slice ([[performance-and-caching]])
- [ ] Decide the fate of `pocketbase-types.ts`: regenerate from TrailBase's `/schema` endpoints, or
      hand-maintain
- [ ] Point auth at `/api/auth/v1/login` + `/refresh` and keep the session handling intact
- [ ] Verify against a populated depot: `npx tsc --noEmit`, `npm run build`, then compare a set of
      report numbers against the PocketBase values for the same rows

## Related

- [[api-contract-trailbase]] — the full contract and its gotchas.
- [[runtime-js-guest-platform]] — the guest frontend; it reads the depot SQLite directly and has no
  record-API client, so [[api-contract-trailbase]] is the contract to implement.
- [[previous-vault-recovery]] — `frontend-tb/` (`14b0518^`) is an earlier TrailBase client whose
  `src/collections/` layer may still be a useful reference, though it targets the older schema names.
