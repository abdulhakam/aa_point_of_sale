---
title: frontend (Next.js POS)
type: system
status: production
maturity: legacy
locator: frontend/
runtime: Next.js 14.0.4, React 18, Mantine 7, PocketBase JS SDK 0.20.1
created: 2026-09-26
tags: [pos, frontend, nextjs, mantine, pocketbase, legacy, production]
related_to: ["[[backend]]", "[[runtime-js-guest-platform]]", "[[guest-ui-is-a-direct-shift-of-legacy]]"]
---

# frontend (Next.js POS)

**Legacy / production.** `frontend/` is the Next.js application that staff actually use
today. It is the complete product: invoicing, cash memo, payments, printing, management and
reports. It talks to PocketBase ([[backend]]) through the official JS SDK.

The guest-WASM frontend ([[runtime-js-guest-platform]]) is the replacement, but it only covers
dashboard / reports / management so far — so this app cannot be retired until invoicing,
printing and the cash-memo screens are either rebuilt or deliberately dropped, and until the
guest UI matches this one screen for screen ([[guest-ui-is-a-direct-shift-of-legacy]]).

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
| `useAPI.ts` | `crud` helpers, the reference-collection cache policy, `hydrateRefs`, `useHydratedRefs`, `useAppliedFilters` |
| `pocketbase-types.ts` | generated record types — **including one per PocketBase view** |
| `types.ts` | form-structure types shared by the generic form generator |
| `permissions.js`, `users.js` | auth/permission helpers |
| `row_counter.js` | the dashboard counters |
| `StatusCheck.tsx` | backend reachability indicator |
| `sections.ts`, `areas.ts`, `categories.ts`, `expenses.ts`, `invoices.ts`, `items.ts`, `order_bookers.ts`, `parties.ts`, `payments.ts`, `transactions.ts` | one module per collection: `FormStructure` definitions plus `onCreate`/`onUpdate`/`onDelete` |

### `useAPI.ts` in detail

**Cache policy.** Reference data changes rarely, so it is cached for
`REFERENCE_STALE_TIME = 5 * 60 * 1000`. `REFERENCE_COLLECTIONS` is exactly:
`areas`, `sections`, `categories`, `items`, `parties`, `order_bookers`, `users`.
Everything else (invoices, transactions, payments, ledgers) uses the global default
`staleTime` from `providers.tsx`.

The file records a deliberate decision about `refetchOnMount`: left at its default
(`true`) while `staleTime` governs re-fetching, because the app's mutations call a bare
`queryClient.invalidateQueries()`, which only refreshes *active* queries — with
`refetchOnMount: false` an invalidated-but-inactive query would never refresh and screens
could show pre-write data. Fresh data inside `staleTime` is served from cache instantly, so
navigation stays instant.

**`crud`** exposes `create`, `read`, `update`, `remove`, `listall` (`getFullList`),
and `listPage` (`getList(page, perPage, …)` — "POS-0011, real server-side pagination for
transactional collections; use this instead of `getFullList` for
invoices/transactions/payments"). `listall` carries a fix note: it used to drop its result
(no `return`), so callers got `undefined`.

**`hydrateRefs(rows, maps, relations)`** synthesises a PocketBase-style `expand` object on
rows fetched *without* a server-side expand, so existing `row.expand?...` render code keeps
working unchanged after a change to how rows are fetched. `party` also hydrates the nested
`party.area.section` chain that deep expands used to provide; `company`/`category` handle
both array and single values; `invoice` is synthesised from the row's own `invoice` id plus
its inline `invoiceNo`, because views carry the number inline. A relation is attached only
when the target is actually present, so a partially-loaded map degrades to the raw id rather
than throwing. `useHydratedRefs(rows, relations)` wraps it with the reference maps.

**`useAppliedFilters(initial)`** implements POS-0026: it holds the filter values a report
query actually reads, so editing inputs does not fire a request until the user presses
APPLY. The page builds its PocketBase `filter` from `applied`, not from live form state;
`apply(next)` snapshots the inputs and `reset()` returns to the initial snapshot — which is
the page's defaults, so the page still loads once on mount. This is a deliberate
performance pattern, kept on the new side ([[runtime-js-guest-platform]]) as the server-rendered
APPLY/RESET form.

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
- `/app/reports` — plus `dailysale`, `difference`, `outstanding`, `payments`,
  `payments/areawise`, `paymentsbycompany`, `productsale`, `profit`, `salesreport`,
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
