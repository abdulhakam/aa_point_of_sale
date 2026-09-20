---
type: Decision
status: Accepted
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Frontend — Next.js Application]]"
affects:
  - "[[AA Point of Sale]]"
tags:
  - architecture
  - pocketbase
  - nextjs
---

# Decision — Use PocketBase and Next.js

## Status

Accepted (in force since project inception; recorded retroactively on 2026-09-19).

## Context

The product is a self-contained POS/ERP for a single retail business, expected to run on
one shop machine with no cloud dependencies. It needs a database, authentication, an admin
surface for schema work, and a fast, familiar UI stack, with minimal operational overhead.

## Decision

- Backend: **PocketBase** — a single Go binary embedding SQLite, with REST API,
  auth, admin UI, and schema migrations.
- Frontend: **Next.js** (App Router) with Mantine, React Query, and the PocketBase JS SDK.
- Business/report logic is expressed as **SQL view collections** inside PocketBase rather
  than in a separate application layer.

## Consequences

- Zero external services and trivial distribution (binary + SQLite file).
- No separate backend codebase; "where is X computed?" answers live in view SQL, which
  works well for aggregation but is harder to unit-test and version than application code.
- The frontend needs no server-side logic beyond serving pages; it talks to PocketBase
  directly, so authorization must be enforced by PocketBase collection rules.
- Schema evolution happens through PocketBase migrations, which are append-only and must be
  kept consistent with the views.

## Alternatives considered

- A conventional Node/Express or Django backend with a relational DB — more code and more
  deployment surface than the single-shop scope justified.
- Firebase/Supabase — cloud dependency, conflicts with the offline single-machine goal.
- Computing totals in the frontend — rejected to keep one source of truth for money math.

## Evidence

- `README.md` states the rationale ("Why PocketBase?", "Why nextjs?").
- `frontend/src/app/pocketbase.js` is the sole client; `frontend/package.json` pins
  `pocketbase` and `next`.
- `backend/pb_migrations/` and 13 view collections carry the business logic.

## Revisit when

- Multi-shop, multi-user concurrency, or cloud sync enters scope.
- Report logic outgrows SQL view queryability and needs testable application code.
- A migration/versioning strategy for views becomes unmanageable.

## Related

- Subsystems: [[Backend — PocketBase Data Service]], [[Frontend — Next.js Application]].
- Report logic consequences: [[Reports & Ledgers]].
- Companion deployment decision: [[Decision — Local Offline Desktop Deployment]].
- Upcoming version decision in this stack's lifetime: [[POS-0019 Upgrade PocketBase v0.22.9 → v0.22.55]]
  and the deferred [[POS-0022 Upgrade PocketBase to v0.40.4]].
