---
title: Verify and finish the guest v1 (PocketBase) import
type: task
status: todo
priority: high
created: 2026-09-27
tags: [migration, import, pocketbase, trailbase, guest, plugin]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-client-side-migration-plugin]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[import-from-v1-drops-invoice-maker]]", "[[runtime-js-guest-platform]]", "[[frontend]]"]
---

# Verify and finish the guest v1 (PocketBase) import

> Correction (2026-09-27): an earlier version of this task said the import tool had to be rebuilt
> from scratch because `frontend-ssr/plugins/import-from-v1/` was deleted with the Node frontend.
> That was wrong about the guest: a ported copy **already exists** at
> `runtime-js/site/app/plugins/import-from-v1/` (`meta.md` + `index.html`), committed in the
> tree. What is missing is not the code but verification.

## Current state

- The guest plugin `runtime-js/site/app/plugins/import-from-v1/` is present and tracked
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
- [ ] Fix or explicitly accept the `invoice_maker` drop: migrate the referenced rows, or null the
      field deliberately, and record which ([[import-from-v1-drops-invoice-maker]]).
- [ ] Confirm the plugin tolerates the record API's plain-text `DELETE` responses if its optional
      "clear destination" path is used ([[trailbase-delete-returns-plain-text]]).
- [ ] Confirm it is idempotent enough to re-run against a partially migrated depot, or document
      why it is not.
- [ ] Then hand off to [[pos-0027-migrate-production-data-to-trailbase]].

## Evidence

- `runtime-js/site/app/plugins/import-from-v1/meta.md` — the ported plugin's own description.
- `runtime-js/site/app/lib/plugins.js` — the guest plugin registry.
- `git log -- frontend-ssr/plugins/import-from-v1` — the deleted Node copy, for history.

## Related

- [[trailbase-client-side-migration-plugin]] — the decision this implements.
- [[pos-0027-migrate-production-data-to-trailbase]] — the migration it feeds.
- [[import-from-v1-drops-invoice-maker]] — the pitfall to resolve.
