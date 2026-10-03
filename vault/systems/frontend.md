---
title: frontend (Next.js POS)
type: system
status: frozen
maturity: legacy
locator: legacyforparity/standalone/
runtime: Next.js 14.0.4, React 18, Mantine 7, PocketBase JS SDK 0.20.1 — compiled, source deleted
created: 2026-09-26
updated: 2026-10-03
tags: [pos, frontend, nextjs, mantine, pocketbase, legacy, production]
related_to: ["[[backend]]", "[[runtime-js-guest-platform]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[cutover-is-guest-only]]"]
---

# frontend (Next.js POS)

> **CORRECTED 2026-10-03 — this system no longer has source.** This note previously read
> `locator: frontend/`, `status: production`, and opened with "**Legacy / production.** `frontend/` is
> the Next.js application that staff actually use today."
>
> **That ended on 2026-09-29.** Commit `c167d311` ("deleted frontend/backend") removed `frontend/`
> from git. What survives on disk is `legacyforparity/standalone/` — a **compiled** Next.js
> standalone bundle (`server.js`, `.next/`, `node_modules/`, `public/`, `package.json`) with **no
> `src/`**. It is untracked, git-ignored, unbuildable and uneditable. See [[cutover-is-guest-only]].
>
> **How to read the rest of this note.** Every table below that names a file under `frontend/` —
> `package.json`, `next.config.js`, `tsconfig.json`, `src/app/api/*`, `.env.local` — describes what
> that file contained *at revision `c167d311^`*, recovered from git history. They are **not** paths
> that exist. The file inventory is kept deliberately: it is the only surviving record of the
> product's shape, and [[tb-0014-point-company-fields-at-companies]] and
> [[tb-0012-wire-nextjs-frontend-to-trailbase]] still need it as their spec.

**Legacy / frozen.** `frontend/` was the Next.js application staff used. It was the complete
product: invoicing, cash memo, payments, printing, management and reports, talking to PocketBase
([[backend]]) through the official JS SDK.

It cannot be retired *by rebuilding it*, but it has been retired by **deletion of its source**. The
guest-WASM frontend ([[runtime-js-guest-platform]]) is the product. What this app still contributes
is a runnable **oracle**: the compiled bundle can be started and compared against, but every gap
recorded below now has to be closed *in the guest* ([[guest-frontend-feature-parity-gaps]]).

## Stack

From `package.json`:

| Area | Choice |
|---|---|
| Framework | `next 14.0.4` (App Router), `react`/`react-dom` 18 |
| UI | `@mantine/core|dates|form|hooks|modals|notifications` 7, `mantine-datatable` 7, `@tabler/icons-react` 2 |
| Data | `@tanstack/react-query` 5 (+ devtools), `pocketbase` 0.20.1 |
| Dates | `dayjs`, `moment` |
| Printing | `react-to-print` 2.14.15 |
| Misc | `clsx`, `lodash.sortby`, `http-serve` |
| Dev | TypeScript 5, ESLint 8 + `eslint-config-next`, Storybook 7 (+ `@storybook/nextjs`) |

`next.config.js`: `output: 'standalone'`, `images.unoptimized: true`.

`tsconfig.json`: `strict: false`, `target: ES6`, `moduleResolution: "bundler"`, path alias
`@/*` → `./src/*`.

## Scripts

| Script | Command | Note |
|---|---|---|
| `dev` | `next dev` | used by [[backend]]'s `DEV.BAT` |
| `build` | `next build` | |
| `start` | `next start` | used by `RUN NEXTJS.BAT` |
| `serve` | `http-server ./out/ -p 3000` | used by `RUN SERVE.BAT` — needs a static `out/` export |
| `lint` | `next lint` | |
| `storybook` / `build-storybook` | Storybook 7 on port 6006 | |
| `build:standalone` | `next build` + three `robocopy` calls into `../standalone` | produces the deployable bundle |

## PocketBase wiring

`src/app/pocketbase.js` is four lines:

```js
import PocketBase from 'pocketbase'
const pb = new PocketBase(process.env.NEXT_PUBLIC_PB_URL);
export default pb
```

Every data access in the app goes through that single shared instance.

`.env.local` (git-ignored) / `.env.local.example`:

| Variable | Meaning | Value here |
|---|---|---|
| `NEXT_PUBLIC_PB_URL` | PocketBase base URL | `http://127.0.0.1:8090` |
| `NEXT_PUBLIC_NAME` | business name on printouts / header | `SAMPLE TRADERS` |
| `NEXT_PUBLIC_ADDRESS` | business address | `123 Sample Street, Sample City` |
| `NEXT_PUBLIC_PHONE` | business phone | `000-0000000` |

⚠️ Note this is a **different business identity** from the new side's `APP_NAME` ("AA Point
of Sale") and from the example file ("AA_W_POS"). Confirm which one is correct before a
cutover — see [[environment]].

## The data-access layer (`src/app/api/`)

This is the layer [[tb-0012-wire-nextjs-frontend-to-trailbase]] wants to replace behind an
unchanged API surface.

| File | Contents |
|---|---|
| `useAPI.ts` | `crud` helpers (`create`/`read`/`update`/`delete`/`listall`), and the `useCreate`/`useRead`/`useUpdate`/`useDelete`/`useFullList` hooks |
| `pocketbase-types.ts` | generated record types — **including one per PocketBase view** |
| `types.ts` | form-structure types shared by the generic form generator |
| `permissions.js`, `users.js` | auth/permission helpers |
| `row_counter.js` | the dashboard counters |
| `StatusCheck.tsx` | backend reachability indicator |
| `sections.ts`, `areas.ts`, `categories.ts`, `expenses.ts`, `invoices.ts`, `items.ts`, `order_bookers.ts`, `parties.ts`, `payments.ts`, `transactions.ts` | one module per collection: `FormStructure` definitions plus `onCreate`/`onUpdate`/`onDelete` |

### `useAPI.ts` in detail

**Corrected 2026-09-29.** This section previously described an API that **is not in the checked-out
file**: `listPage`, `hydrateRefs`, `useHydratedRefs`, `useAppliedFilters` and a
`REFERENCE_STALE_TIME = 5 min` reference cache. Verified against
`frontend/src/app/api/useAPI.ts`, which is **77 lines** and exports only `crud`, `useCreate`,
`useRead`, `useUpdate`, `useDelete` and `useFullList`. All five claimed symbols are absent, and
`providers.tsx` sets a single global `staleTime: 1000 / 2` (500 ms) with no reference-collection
override.

What the file actually does:

- **`crud`** — `create`, `read`, `update`, `remove`, `listall` (`getFullList`).
- **`useFullList({ collection, filter, sort, expand })`** — the React Query hook every report page
  uses. It pages PocketBase with `?page=N&perPage=500` and concatenates, which is the mechanism
  behind the legacy report timings in [[guest-vs-legacy-report-performance]].
- **`useCreate` / `useRead` / `useUpdate` / `useDelete`** — thin mutation hooks.

**Consequence for the APPLY/RESET claim.** The vault previously recorded that the legacy app gates
report queries behind `useAppliedFilters` (POS-0026) and that this is parity with the guest's
server-rendered APPLY/RESET form. On the checked-out revision the report pages read
`form.values` **live** and re-query as the form changes — there is no APPLY gate. So the guest's
APPLY-gated form is a **behaviour difference**, not parity, and it should be re-decided rather than
assumed equivalent.

### Form generation

`components/FormGenerator.tsx` and `FormGeneratorBasic.tsx` render a form from a
`FormStructure` (a `fields` map of `{type, default, baseProps}`), so each
`api/<collection>.ts` module is mostly declarative configuration. `items.ts`, for example,
defines `cost_price` (labelled `CP`), `sale_price` (`SP`), `box_size_qty` (`Carton Size`)
and a `category` select whose label is **`Company`** — the naming decision in
[[tb-0014-point-company-fields-at-companies]].

Shared components: `DataViewTable`, `InvoiceDataTable`, `ReportViewTable`, `InfoViewModal`,
`CreateRecord/`, `BetterComps/{AutoComplete,Select}`, `Modals/CreatePayment`,
`NumberAddress`, `printing/{PrintHead,PrintContent,PrintFoot}` + `printing/styles.module.css`,
`functions/{dataFilter,openInNewTab,idGenerator,qtyParser}`,
`global/apiCallIndicator/fetchingIndicator`, `hooks/useTime`.

## Route map

App Router directories under `src/app/`, each with a `page.tsx`:

- `/` (`page.tsx`) and `/auth` (`auth/page.tsx`), guarded by `routeProtector.tsx` +
  `context/AuthContext.js`.
- `/app/dashboard`
- `/app/cashmemo` — plus `cash_payment_vouchers`, `cash_recieve_vouchers`, `da_entry`,
  `expenses`, `payments`
- `/app/invoices` — plus `purchase`, `sale`, `return`, `difference`, `orders`, `print`,
  `printinvoice`, `printinvoice/queue`
- `/app/management` — plus `areas`, `bookers`, `categories`, `items`, `parties`, `sections`
- `/app/reports` — plus `difference`, `payments`,
  `payments/areawise`, `paymentsbycompany`, `profit`, `salesreport`,
  `stockreport`, `stockreport/itemTransactionsReport`, `transactions/unified`, and
  `ledgers/{area,booker,general,party}`
- `/views/invoice`

Shell components: `app/layout.tsx`, `app/NavbarMinimal.tsx` (+ `.module.css`),
`app/TimeDisplay.jsx`; providers in `app/providers.tsx` (React Query + Mantine).

Side-by-side with [[runtime-js-guest-platform]]: [[route-map]].

## What the legacy app has that the guest app does not

| Capability | Legacy | Guest |
|---|---|---|
| Invoice entry (purchase / sale / return / difference) | ✅ | ❌ (first slice only) |
| Orders | ✅ | ❌ |
| Cash memo: payment & receive vouchers, DA entry, expenses | ✅ | ❌ |
| Invoice printing + print queue | ✅ | ❌ |
| Dashboard | ✅ | ✅ |
| Reports (11 + ledgers) | ✅ | ✅ (not `payments/areawise`) |
| Management (7 entities) | ✅ | ✅ |
| Storybook component workshop | ✅ | — |

Two UI stacks for the same screens is the current state; [[trailbase-migration]] covers how
that converges.

## Related

- [[guest-frontend-feature-parity-gaps]] — the concrete list of what is missing on the new side.
- [[route-map]] — every route in both apps.
- [[performance-and-caching]] — what the query cache and the SQL views do for speed.
