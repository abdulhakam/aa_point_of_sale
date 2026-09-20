---
type: Subsystem
status: Active
created: 2026-09-19
updated: 2026-09-19
belongs_to:
  - "[[AA Point of Sale]]"
related_to:
  - "[[Backend — PocketBase Data Service]]"
  - "[[Data Model]]"
tags:
  - frontend
  - nextjs
  - react-query
  - ui
---

# Frontend — Next.js Application

## Purpose

The user interface and all client-side behavior of the POS: routing, screens, forms,
authentication, data access, and printing.

## Responsibilities

- Render every route under `frontend/src/app/` (App Router) — see [[Route Map]].
- Authenticate users against PocketBase and guard routes.
- Read/write PocketBase collections via the shared client and React Query hooks.
- Present reports and ledgers sourced from PocketBase view collections.
- Print invoices and views (via `react-to-print`).

## Stack

- Next.js 14 (App Router, `next` 14.0.4) with React 18 and TypeScript.
- Mantine v7 (`@mantine/core|dates|form|hooks|modals|notifications`) + Tabler icons.
- TanStack React Query v5 for server state.
- `pocketbase` JS SDK 0.20.x as the sole data client.
- `react-to-print` for printing; `mantine-datatable` for tables; dayjs/moment for dates.
- Storybook 7 for component work (`.storybook/`).

## Interfaces

- Consumes PocketBase REST at `NEXT_PUBLIC_PB_URL` (default `http://127.0.0.1:8090`).
- `frontend/src/app/pocketbase.js` — single shared `PocketBase` instance.
- `frontend/src/app/api/*` — per-collection access helpers and `useAPI.ts` CRUD/query hooks.
- `frontend/src/app/providers.tsx` — Mantine, Modals, Notifications, Auth, React Query.
- `frontend/src/app/routeProtector.tsx` — renders a login prompt when the auth store is
  invalid.

## Key files

- `frontend/src/app/layout.tsx`, `page.tsx` — root layout and redirect entry.
- `frontend/src/app/auth/page.tsx` — login.
- `frontend/src/app/app/` — authenticated shell: `NavbarMinimal.tsx`, `layout.tsx`, and
  the `dashboard/`, `cashmemo/`, `invoices/`, `management/`, `reports/` trees.
- `frontend/src/app/views/invoice/` — invoice view/print.
- `frontend/src/app/context/AuthContext.js` — login/logout provider.
- `frontend/src/app/theme.ts`, `frontend/postcss.config.cjs` — Mantine theming.

## Data flow

1. A page calls a hook in `src/app/api` (directly or via `useAPI.ts`).
2. The hook calls the shared `pb` client, which issues a REST request to PocketBase.
3. PocketBase resolves base collections or SQL view collections and returns records.
4. React Query caches results (`staleTime` ~0.5s; refetch on mount/reconnect).

## Constraints and caveats

- Route protection is client-side only; there is no Next.js middleware (`page.tsx`
  carries a TODO about middleware).
- `routeProtector.tsx` evaluates auth during render (its `useEffect` is commented out)
  and logs the current path to the console — a known rough edge.
- The frontend assumes the PocketBase schema view names and field names exactly as
  documented in [[Data Model]]; renames there break report pages.

## Related

- Backend contract: [[Backend — PocketBase Data Service]].
- Report semantics consumed by these pages: [[Reports & Ledgers]].
- Terminology used by the UI: [[Glossary]].
- Every route this app serves: [[Route Map]].
- Ongoing performance work touching this subsystem: [[POS-0009 Fix React Query cache config]],
  [[POS-0011 Paginated list plumbing]], [[POS-0015 Trim expands + adopt pagination in report pages]].
