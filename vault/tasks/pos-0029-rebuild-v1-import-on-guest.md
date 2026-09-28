---
title: Verify and finish the guest v1 (PocketBase) import
type: task
status: todo
priority: high
created: 2026-09-27
tags: [migration, import, pocketbase, trailbase, guest, plugin]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-client-side-migration-plugin]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[import-from-v1-drops-invoice-maker]]", "[[v1-categories-map-to-companies]]", "[[tb-0014-point-company-fields-at-companies]]", "[[runtime-js-guest-platform]]", "[[frontend]]"]
---

# Verify and finish the guest v1 (PocketBase) import

> Correction (2026-09-27): an earlier version of this task said the import tool had to be rebuilt
> from scratch because `frontend-ssr/plugins/import-from-v1/` was deleted with the Node frontend.
> That was wrong about the guest: a ported copy **already exists** at
> `trailbase/src/runtime/app/plugins/import-from-v1/` (`meta.md` + `index.html`), committed in the
> tree. What is missing is not the code but verification.

## Current state

- The guest plugin `trailbase/src/runtime/app/plugins/import-from-v1/` is present and tracked
  (confirmed 2026-09-27). Its `meta.md` documents the full import: PocketBase REST → TrailBase
  record APIs in dependency order, id and enum translation, link-table expansion, optional
  clear/dry-run.
- The former Node frontend's copy (`frontend-ssr/plugins/import-from-v1/`) was deleted with
  `frontend-ssr` on 2026-09-27 ([[guest-ui-is-a-direct-shift-of-legacy]]); it remains in git
  history.
- The guest copy has **not** been run end-to-end in this project, and it still inherits the known
  defect: it drops `invoices.invoice_maker` ([[import-from-v1-drops-invoice-maker]]).

## Work

- [ ] Exercise the guest plugin against a throw-away depot seeded from a **copy** of production
      data, or a representative subset, and confirm the per-collection counts and the translated
      values ([[data-model]], [[api-contract-trailbase]]).
- [x] Fix or explicitly accept the `invoice_maker` drop: migrate the referenced rows, or null the
      field deliberately, and record which ([[import-from-v1-drops-invoice-maker]]). Chosen
      2026-09-27: **accept and make it visible** — the field is still dropped, but the importer now
      counts and logs how many invoices lost a maker (8,927 in the production copy). Migrating the
      rows (option 2) would mean creating TrailBase accounts; not done.
- [ ] Confirm the plugin tolerates the record API's plain-text `DELETE` responses if its optional
      "clear destination" path is used ([[trailbase-delete-returns-plain-text]]).
- [ ] Confirm it is idempotent enough to re-run against a partially migrated depot, or document
      why it is not.
- [ ] Then hand off to [[pos-0027-migrate-production-data-to-trailbase]].

## Progress

### 2026-09-27 — company mapping corrected and validated

A census of the committed production copy (`backend/p_data/data.db`) showed the legacy DB has **no
`companies` table**: `items.category`, `order_bookers.company` and `parties.company` all reference
the single legacy `categories` collection, which the legacy UI shows as "Companies". The imported
plan previously mapped `categories` → new `categories` and expected legacy `companies` for the
party/booker links, which would have **dropped every party/booker company link** (there is no
source `companies` collection to read).

Fixed: the `categories` step now carries `mirrorApi: "companies"` and each legacy company row is
written to both new tables under separate id maps — `categories` for `items.category` and the
item-company reports, `companies` for the link FKs. Recorded as [[v1-categories-map-to-companies]].

Evidence this is right, over the production copy:

- `node --check` on the plugin's inline script passes.
- A reference re-run of the mapping rules over the DB resolved every reference: 206 item→category,
  5 booker→company, 13 party→company, plus all invoice/transaction/payment FKs — **0 unresolved**;
  15 legacy companies mirrored into 15 `categories` + 15 `companies`.
- `guest-smoke.mjs` remains **71/71** after the UI reskin it shipped alongside.

Still open (this is why the task stays `todo`): run the real browser plugin end-to-end against a
throw-away depot seeded from a **copy** of production, and confirm per-collection counts and the
translated values; confirm the wipe path's plain-text `DELETE` tolerance; confirm re-run idempotency.

## Evidence

- `trailbase/src/runtime/app/plugins/import-from-v1/meta.md` — the ported plugin's own description.
- `trailbase/src/runtime/app/lib/plugins.js` — the guest plugin registry.
- `git log -- frontend-ssr/plugins/import-from-v1` — the deleted Node copy, for history.

## Related

- [[trailbase-client-side-migration-plugin]] — the decision this implements.
- [[pos-0027-migrate-production-data-to-trailbase]] — the migration it feeds.
- [[import-from-v1-drops-invoice-maker]] — the pitfall to resolve.
