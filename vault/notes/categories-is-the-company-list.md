---
title: "categories IS the company list in the legacy system — and that makes categories the redundant table, not companies"
type: note
status: active
created: 2026-09-29
system: legacy
tags: [legacy, frontend, categories, companies, schema, naming, drift]
belongs_to: "[[data-model]]"
related_to: ["[[table-audit-2026-09-29]]", "[[tb-0014-point-company-fields-at-companies]]", "[[route-map]]", "[[frontend]]", "[[backend]]", "[[frontend]]"]
---

# "categories" IS the company list in the legacy system

Asked 2026-09-29: what is the legacy frontend using the `categories` table for?

**Two things, and the second one is the real one. In the legacy system `categories` *is* the
company list — the collection is named `categories`, but every user-facing surface calls it
"companies".**

## The evidence, in the legacy code

| file:line | what it does |
|---|---|
| `app/management/page.tsx:10` | `{ text: "companies", path: "management/categories" }` — the nav **label is "companies"**, the route is "categories" |
| `app/management/categories/page.tsx` | the CRUD screen itself, `listCategories` |
| `app/reports/paymentsbycompany/page.jsx:111` | `const companies = useCRUD().fullList({ collection: "categories" })` — variable named `companies`, collection `categories` |
| `app/reports/stockreport/page.tsx:68,99` | filter options built from `categories`, and rendered as **`Company: {…name}`** |
| `app/reports/difference/page.tsx:65,97` | the same, filter labelled **"Company"** |
| `app/reports/profit/page.tsx:196` | `dataQuery={{ collectionName: "categories" }}` |
| `app/reports/transactions/unified/page.tsx:195` | `dataQuery={{ collectionName: "categories" }}` |
| `app/invoices/purchase/CreateSupplier.tsx:36` | creating a supplier is `pb.collection("categories").create({ name })` |
| `app/api/order_bookers.ts:42`, `app/api/items.ts:43`, `app/cashmemo/payments/PaymentsView.jsx:441` | form data queries against `categories` |

So one collection served **two roles**: the item classification (`items.category`) and the
**company dimension** used by Payments By Company and every "Company" filter.

The data confirms it. The 15 names are business names, not product categories:

```
BAKE PARLOR  BRUNO'S  DELIGHT  GHANI PAPAR  GOLDEN  GOREY  HAMDARD
HAMDARD F  KOLSON  NATIONAL RECIPIE  QARSHI F  SHAHZAD PAPAR
SHAN RECIPIE  SOFI TRADERS  ZEESHAN PAPAR
```

`items.category` is really **"which company this item belongs to"**. The column is misnamed.

## Why this corrects the previous answer

[[table-audit-2026-09-29]] called `companies` "a duplicate the migration invented, and it is not in
the source". **That was wrong in substance.** The company dimension is real, pre-existing and
load-bearing in legacy — it was merely *stored* in a collection named `categories`. The migration did
the right thing by promoting it into its own `companies` table, because legacy genuinely conflates
two concepts in one collection. PocketBase has no `companies` collection and no `companies` view,
and the import log says so: `companies: not present on the source server, skipped`.

**The redundant table is `categories`, not `companies`.**

## Current state in the new system

```
items.category                       -> categories            206 of 207 items
party_companies.company              -> companies             13 of 13 rows
order_booker_companies.company       -> companies             5 of 5 rows
```

Same 15 names, **different ids**, no link between the two tables. The guest author already saw
this: `app/lib/entities.js:36` labels the `categories` API **"Item Companies"** and `:45` labels
`companies` **"Companies"** — two screens, two tables, one set of business names.

The consequence is that **items point at the wrong one of the pair**: the item dimension resolves
into `categories`, while the party and booker company links resolve into `companies`.

## What follows

- Do **not** drop `companies`. It is the one carrying the FK links.
- The candidate to retire is `categories`, and only by **repointing `items.category` at
  `companies`**, not by deleting rows. The same 15 rows then serve both purposes, the duplicate
  disappears, and the drift risk goes with it.
- This is a data migration on 206 rows plus a schema change, and it needs a decision — it is
  [[tb-0014-point-company-fields-at-companies]], which is already the open question, now with the
  evidence that resolves it.
- The report SQL is not affected: `payments_view.company` and the company split already resolve
  through `companies`, and [[report-enum-translation-2026-09-29]] verified those views against
  PocketBase unchanged.

## Related

- [[table-audit-2026-09-29]] — the audit this corrects.
- [[tb-0014-point-company-fields-at-companies]] — the open naming question.
