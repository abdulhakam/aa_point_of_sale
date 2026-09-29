---
title: "v1 import: legacy categories are the companies, and map into both new tables"
type: decision
status: accepted
decided_on: 2026-09-27
created: 2026-09-27
tags: [migration, import, pocketbase, trailbase, categories, companies, data-model]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[data-model]]", "[[trailbase-client-side-migration-plugin]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[tb-0014-point-company-fields-at-companies]]", "[[import-from-v1-drops-invoice-maker]]"]
---

# v1 import: legacy categories are the companies, and map into both new tables

## Decision

The v1 (PocketBase) importer writes the legacy **`categories`** collection — which the legacy
frontend labels and shows as **"Companies"** — into the new **`companies`** table, and **mirrors
the same rows into the new `categories` table**.

Both writes are required, not optional:

- The new `companies` table is the FK target of `party_companies.company` and
  `order_booker_companies.company`, and the legacy `parties.company` / `order_bookers.company`
  arrays hold **`categories` ids**. Without the `companies` copy those link rows cannot be created.
- The new `categories` table is the FK target of `items.category`, and the item-company report
  column and the `company` report filter read from it (`compute/views.js`,
  `lib/report-pages.js`). Without the `categories` copy every item loses its company and every
  item-company report goes blank.

So one legacy company row becomes one row in each of the two new tables, under two independent id
maps; `items.category` uses the `categories` map and the link tables use the `companies` map.

## Why the collision exists

The legacy schema has a **single** company list: the collection is *named* `categories` but is
labelled **"Company"** on the item form and edited through the legacy `management/categories`
screen the legacy hub calls *"companies"*. It has **no** `companies` collection at all — verified
against the committed production copy `backend/p_data/data.db`:

```text
tables: ... areas, categories, expenses, invoices, ... items, order_bookers, parties, ...
(no `companies` table)

items.category        -> a `categories` id (206 of 207 items set)
order_bookers.company -> JSON array of `categories` ids (5 links on 4 bookers)
parties.company       -> JSON array of `categories` ids (13 links)
```

The new schema split that one concept in two: `categories` (item grouping, `items.category` FK) and
`companies` (party/booker grouping). This is the open naming collision
([[tb-0014-point-company-fields-at-companies]]); the importer has to reconcile it rather than
choose a side, because both new FK targets are live.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Import into `categories` only (the pre-existing plan) | Leaves the legacy `parties`/`order_bookers` company arrays pointing at ids that land in the *other* table, so every party/booker company link is silently dropped. |
| Import into `companies` only | Every `items.category` write is a foreign-key violation or null, and item-company reports go blank. |
| Add a schema migration repointing `items.category` at `companies` | A real change to an applied migration's intent plus the reports/management readers; that is [[tb-0014-point-company-fields-at-companies]], not the import. Kept as the follow-up that would remove the mirror. |
| Match company names across the two tables instead of ids | Name matching is a guessed reference, which the vault forbids ([[import-from-v1-drops-invoice-maker]] makes the same point for `invoice_maker`). |

## Consequences

- The 15 production companies exist twice — once in `categories` (for items/reports) and once in
  `companies` (for party/booker links) — until the collision is resolved
  ([[tb-0014-point-company-fields-at-companies]]). Resolving it will let one copy be dropped.
- The legacy `companies` collection step is kept in the plan for source DBs that have one, but it
  is absent in production and skipped.
- The importer now also **reports** the `invoice_maker` drop count in its run log, so that loss is
  visible ([[import-from-v1-drops-invoice-maker]]).

## Evidence

- `trailbase/runtime/app/plugins/import-from-v1/index.html` — the `categories` step carries
  `mirrorApi: "companies"`; `flush()` writes the same batch to both APIs under separate id maps.
- `trailbase/runtime/app/plugins/import-from-v1/meta.md` — documents the mapping to the operator.
- `backend/p_data/data.db` census (2026-09-27): 15 categories, 207 items (206 with a category),
  4 bookers (5 company links), 942 parties (13 company links), no `companies` table.
- A reference re-run of the mapping rules over that DB resolved **every** item, booker, party,
  invoice, transaction and payment reference (0 unresolved).
- `trailbase/migrations/main/U1790208000__create_base_tables.sql` — `items.category`
  REFERENCES `categories`; `party_companies`/`order_booker_companies` REFERENCE `companies`.

## Related

- [[trailbase-client-side-migration-plugin]] — the tool this mapping lives in.
- [[pos-0029-rebuild-v1-import-on-guest]] — the import's verification work item.
- [[tb-0014-point-company-fields-at-companies]] — the collision this works around.
- [[data-model]] — the two company tables.
