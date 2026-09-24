---
type: Task
status: Backlog
ticket: TB-0002
priority: P2
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Backend — TrailBase Server]]"
  - "[[Frontend — Next.js Application]]"
  - "[[Route Map]]"
created: 2026-09-24
updated: 2026-09-24
tags:
  - trailbase
  - frontend
  - api
---

# TB-0002 Wire a frontend to the TrailBase server

## Goal

A client that talks to the TrailBase record APIs and renders the same POS flows the PocketBase
frontend does.

## Done when

- A client authenticates against `/api/auth/v1/login` and reads/writes at least items, parties and
  invoices through `/api/records/v1/*`.
- Reports are produced by client-side aggregation over the base tables, matching the preserved view SQL
  for the same inputs.
- No PocketBase-shaped call (`pb.collection(...)`, `filter: 'a = "b" && c = 1'`, `getFullList`) remains
  on the path being wired.

## Context

The existing `frontend/` is PocketBase-shaped throughout (`frontend/src/app/api/*`, `useAPI.ts`), so it
needs either the `trailbase` client or a thin adapter shim. A previous TrailBase frontend
(`frontend-tb/`) exists in git history but is deleted from the working tree and targets the *earlier*
scaffold's names (`products`, `companies2parties`, `partiesEnumType`, TEXT enums), so it is a reference
for structure, not a starting point.

Held deliberately: see [[TrailBase Backend]]. The TrailBase system's specs and structure are expected to
change substantially, so this should not be started until they are re-stated.

## Done when (detail)

Report aggregation is the risky half — the money arithmetic lives in the preserved view SQL
(`full_database_schema.sql`, `../dltbl/views_from_pb/`), and duplicating it in TypeScript is where
divergence will creep in. Decide early whether the client aggregates, a WASM handler runs the preserved
SQL, or a materialised table is introduced; see
[[Decision — Drop SQL views; aggregate reports client-side]].

## Verification

To be written when the task starts. It must at minimum compare client-computed report output against
the preserved view SQL for the same rows, in the spirit of the PocketBase-side equivalence tests.

## Related

- [[Backend — TrailBase Server]] — the API contract and its gotchas.
- [[Frontend — Next.js Application]] — the existing client.
- [[POS-0015 Trim expands + adopt pagination in report pages]] — the PocketBase-era pagination/expand
  discipline this should preserve.
