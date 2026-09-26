---
title: TB-0014 Resolve the "Company" naming collision between categories and companies
type: task
status: todo
priority: medium
created: 2026-09-26
tags: [naming, schema, categories, companies, items]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[data-model]]", "[[frontend-ssr]]"]
---

# TB-0014 Resolve the "Company" naming collision between categories and companies

There are two tables that mean different things and one label used for both.

| Table | What it holds | Label in the UI |
|---|---|---|
| `categories` | the item's manufacturer/brand grouping | **"Company"** (Items form), "Item Companies" (Management) |
| `companies` | a trading company a party or booker is associated with | "Companies" (Management) |

So `items.category` reads as "Company" everywhere a user looks, while the schema calls it
`category` and a *different* table is called `companies`. A reader who trusts the schema will look in
the wrong table, and a reader who trusts the UI will not find a `company` column on `items`.

## Current state, in code

- `frontend-ssr/src/lib/entities.js` — `categories` has `label: "Item Companies"`,
  `singular: "Item Company"`; but `items` has
  `{ name: "category", label: "Company", type: "relation", source: "categories" }`.
- `frontend/src/app/api/items.ts` — the same: a `category` field whose `baseProps.label` is
  `"Company"`, with `dataQuery: { collectionName: "categories" }` — so the wrong-looking query is
  actually correct, which is what makes this a trap.
- The legacy Management screen exposes **no** Companies screen at all, while
  [[frontend-ssr]] added `/management/companies`. So one frontend edits `companies` and the other
  cannot.

## The open question

`trailbase/README.md`, § *Follow-ups* item 3:

> Point the "Company" fields at `companies`: `items.category` is labelled "Company" in
> `frontend/src/app/api/items.ts`. Decide whether `items` also needs a `company` foreign key.

So there are two sub-questions, and they are genuinely separate:

1. **What is `categories` for?** Is it the item company (a brand/manufacturer), or a product
   category in the ordinary sense? The label says the former; the name says the latter.
2. **Does `items` need a `company` FK as well?** I.e. does an item belong to a company *in addition
   to* a category? If the answer is no, only the label needs fixing. If yes, this is a schema change
   — which means a **new migration**, never an edit to the applied one
   ([[trailbase-stale-depot-skips-migration]]).

## Options

1. **Rename the label only.** `categories` keeps its name; the UI stops calling it "Company" and
   starts calling it "Category" (or "Item Company" consistently). Zero migration; removes the trap;
   loses the business's own vocabulary if "Company" is what staff actually say.
2. **Rename the concept in the schema.** `categories` → something unambiguous and `items.category` →
   the matching name. A real migration plus a rename across both frontends and every report column
   that emits `company` from a category join (see `frontend-ssr/src/routes/reports.js`'s
   `COMPANY` column and `entities.js`'s `resolve: "categories"`).
3. **Split them.** Add `items.company` as a real FK to `companies` if items genuinely need one, and
   keep `category` for the brand grouping — possibly renaming `category` to make the pair
   unambiguous ("brand" + "company").
4. **Decide `categories` is the company.** Make `categories` the single company concept and drop or
   repurpose `companies`. Only viable if nothing needs the party/booker company list separately —
   but `party_companies` and `order_booker_companies` both reference `companies`, so this would be a
   large change.

The prior vault recorded a decision titled *"company replaces category"* (commit `4df9f50`,
"docs(vault): Record that company replaces category"), which suggests option 4 was once the intent.
**Read it before choosing**, because it may already answer this:
`git show "8f0349c^:vault/decisions/trailbase-company-replaces-category.md"` (see
[[previous-vault-recovery]]).

## Subtasks

- [ ] Read the old *company-replaces-category* decision and determine whether it settles this
- [ ] Establish what the business calls each thing — the UI label is the only evidence currently in
      the repository
- [ ] Decide: label-only, rename, or add a real `items.company`
- [ ] If the schema changes, write a **new** migration and keep the old one untouched
- [ ] Update both frontends together: `items` label, the Management hub, and any report column that
      renders a category as "Company" (`frontend-ssr/src/routes/reports.js` defines a `COMPANY`
      column; `frontend-ssr/pages/reports/*/meta.json` reference `company` keys)
- [ ] Update [[data-model]] and [[glossary]] to match the outcome either way

## Evidence

- `trailbase/README.md` § *Follow-ups* item 3, quoted above.
- `frontend-ssr/src/lib/entities.js` — `categories` labelled "Item Companies" vs `items.category`
  labelled "Company" and resolving to `categories`.
- `frontend/src/app/api/items.ts` — the same mismatch, with `collectionName: "categories"`.
- `trailbase/traildepot/migrations/main/U1790208000__create_base_tables.sql` — `categories` and
  `companies` as separate tables; `party_companies` and `order_booker_companies` both referencing
  `companies`.
- `frontend-ssr/pages/reports/profit/meta.json` — a `company` filter sourced from `categories`,
  which is the label/source mismatch in its most user-visible form.
