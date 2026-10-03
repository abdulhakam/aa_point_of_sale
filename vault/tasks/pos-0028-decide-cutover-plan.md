---
title: POS-0028 Decide the cutover shape
type: task
status: done
priority: critical
created: 2026-09-26
tags: [decision, cutover, strategy, blocking, migration]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[keep-legacy-stack-in-production]]", "[[guest-frontend-feature-parity-gaps]]", "[[cutover-is-guest-only]]"]
---

# POS-0028 Decide the cutover shape

> **CLOSED 2026-10-03 by [[cutover-is-guest-only]] — shape B, guest only.** The two shapes below are
> preserved as the record of the question. One of them is no longer *available*: `frontend/` and
> `backend/` were deleted from git on 2026-09-29 (`c167d311`), so shape A would have to edit files
> that no longer exist. The decision note records the evidence and what it costs.
>
> Subtasks 1, 2 and 3 are answered by the *unavailability* of shape A rather than by an estimate:
> there is nothing left to enumerate, nothing left to run without a static export, and nothing left
> to size. Subtask 5 — "supersede whichever task the decision makes unnecessary" — was not merely
> done, it became mandatory.

One decision gates the rest of the migration: **is the legacy Next.js UI repointed at TrailBase, or
retired in favour of expanding [[runtime-js-guest-platform]]?**

Everything else is downstream of it.

## The two shapes

### A — Repoint the existing UI

Keep `frontend/` as the product. Replace its data layer so it talks to TrailBase instead of
PocketBase.

- **Effort:** the client adapter and every query rewrite ([[tb-0012-wire-nextjs-frontend-to-trailbase]]),
  plus [[tb-0013-rework-report-screens-without-views]] for the view-dependent screens.
- **Nothing is rebuilt.** Invoicing, printing, cash memo, orders and expenses keep working
  unchanged, because only the transport changed.
- **[[runtime-js-guest-platform]] becomes redundant** for reports and management — either deleted,
  or kept as a read-only/print-oriented view. That has to be decided too, or the workspace ends up
  with two frontends by inertia ([[keep-legacy-stack-in-production]]).
- **Where the aggregation runs changes.** PocketBase computed in SQL; TrailBase cannot
  ([[trailbase-drop-sql-views]]), so the browser would carry the arithmetic unless the guest's
  server-side snapshot is reused ([[trailbase-incremental-report-refresh]]).
- ⚠️ **A regression to manage:** the legacy client fetches whole views (9k–26k rows). Pointed at
  TrailBase it would have to fetch base tables and compute — the exact problem the SQL work on
  PocketBase was fixing ([[performance-and-caching]]). The server-side snapshot is the mitigation, and
  exploiting it means the frontend needs a server, not just a static bundle.

### B — Retire the Next.js UI and complete the guest platform

Build the missing screens on [[runtime-js-guest-platform]] and delete `frontend/`.

- **Effort:** everything in [[guest-frontend-feature-parity-gaps]] — invoice entry for four types plus
  orders, printing and the print queue, and the whole cash-memo module.
- **One stack, one deploy.** No adapter, no filter translation, no second build (no `build:standalone`,
  no Storybook), no duplicated business identity ([[environment]]).
- **Server-rendered by construction**, so the aggregation, caching and the page host are already in
  the right place.
- ⚠️ **Higher risk on the screens that matter.** Invoice entry and printing are where a mistake costs
  money and paper. They would be rewritten, not ported.
- ⚠️ **No test suite for the legacy behaviour** to port against — the guest smoke suite
  (`node trailbase/tools/guest-smoke.mjs`) covers [[runtime-js-guest-platform]] only. The legacy
  app has none, so "the new screen behaves the same" would be asserted by hand.

## The questions this decision must answer

1. **What happens to the guest frontend under A?** Kept (as the report/print surface), or deleted?
   If kept, it is served by TrailBase itself ([[guest-app-host-port]]) and owns the `/reports`,
   `/management` and `/p` spaces.
2. **Where does the arithmetic run under A?** Client-side (simple, slow, and a regression) or through
   the guest as a data service (fast, but makes the legacy app depend on the guest host).
3. **Is a hybrid acceptable?** E.g. Next.js for entry and printing, the guest for reports and
   management. That is effectively today's split, minus the shared backend — viable, but it means
   maintaining both UIs deliberately.
4. **What is the rollback?** How long does PocketBase stay writable, and how is a partial cutover
   reversed? [[keep-legacy-stack-in-production]] says the legacy stack stays live until parity — so
   what ends that period?
5. **Does printing survive?** The guest app has no address/phone/app_name equivalent for a printout
   header and no print queue at all.
6. **Does anything depend on PocketBase's world-readable API?** It is about to become
   authenticated-only. Either something breaks, or nothing does — this should be established, not
   assumed.

## Subtasks

- [x] Enumerate anything that calls PocketBase besides `frontend/` (scripts, exports, other tools,
      external integrators) — **answered by unavailability**: `legacyforparity/` holds only
      `backend/` and a compiled `standalone/` bundle, neither with a callable integration surface
- [x] Establish whether the legacy app can run without a static export — i.e. whether a hybrid (shape 1
      with `npm run start`) is acceptable operationally — **moot**: no `package.json` script set and
      no `src/` survive, so there is no `npm run start` to run
- [x] Estimate shape B honestly: invoice entry × 4 types, orders, printing, print queue, cash memo × 5
      screens — carried by [[guest-frontend-feature-parity-gaps]], and since largely built by
      [[guest-invoice-lifecycle]]
- [x] Decide, and write the answer as a new decision note in `decisions/` (do not edit
      [[keep-legacy-stack-in-production]] — it says the cutover is a separate decision) —
      [[cutover-is-guest-only]]
- [x] Supersede or delete whichever of [[tb-0012-wire-nextjs-frontend-to-trailbase]] /
      [[tb-0013-rework-report-screens-without-views]] the decision makes unnecessary — **both**, marked
      `blocked` with the reason; their checklists left unticked
- [x] Record the rollback plan and the point at which PocketBase stops being writable — recorded in
      [[cutover-is-guest-only]]: rollback is the frozen compiled bundle plus
      `legacyforparity/backend/p{_b,}data/`, not a rebuild, and there is no git copy
- [x] Update [[trailbase-migration]], [[system-status-overview]] and [[route-map]] to match — done
      2026-10-03. [[route-map]] was the worst offender: it still listed all 15 invoice and cash-memo
      routes as "❌ not built" and put the guest on `:4003`.

## Why this is the critical-path task

[[trailbase-migration]]'s sequence places this decision (step 7) before repointing a client (step 8)
and before migrating data (step 9), because both of those are shaped by it: a repoint changes what
must be translated in the client, and a retire changes what must exist before data can move. Doing
either first means doing it twice.

## Related

- [[aa-point-of-sale]] — the constraints: the business is live, deployment is local
  ([[offline-local-deployment]]), and performance was the motivation.
- [[guest-frontend-feature-parity-gaps]] — the cost of shape B.
- [[tb-0012-wire-nextjs-frontend-to-trailbase]] — the cost of shape A.
- [[keep-legacy-stack-in-production]] — the interim policy this decision ends.
