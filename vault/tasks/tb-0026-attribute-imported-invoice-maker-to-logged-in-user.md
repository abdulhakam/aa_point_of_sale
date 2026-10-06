---
title: "Attribute imported invoices.invoice_maker to the logged-in operator instead of dropping it"
type: task
status: doing
priority: low
created: 2026-09-29
updated: 2026-09-29
tags: [migration, import, invoice-maker, attribution, deferrable, far-future]
belongs_to: "[[pos-0029-rebuild-v1-import-on-guest]]"
related_to: ["[[import-from-v1-drops-invoice-maker]]", "[[trailbase-client-side-migration-plugin]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[api-contract-trailbase]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[trailbase-encode-enums-as-integer-codes]]"]
---

# Attribute imported invoices.invoice_maker to the logged-in operator instead of dropping it

**DEFERRED — deliberately far in the future.** It is not on the critical path for the invoice and
cash-memo work, and everything else about the migration is correct without it. Do not pull this
forward unless someone asks who entered historical invoices.

**VERIFIED NOT DONE, 2026-10-06** (asked directly, in case the vault was stale). Both the data and the
code say it is still open:
- `SELECT COUNT(*) FROM invoices WHERE "invoice_maker" IS NOT NULL` on the depot = **0**, out of 8,927
  invoices — every maker reference is still dropped.
- The importer still drops it: `runtime/app/plugins/import-from-v1/index.html:520` increments
  `state.droppedMakers`, and `:557` logs `"…had invoice_maker set; that reference is dropped"`.

So the `status: todo` is correct. Nothing below has been started.

## The decision

Today the importer **drops** `invoices.invoice_maker`: PocketBase's `_user` ids and TrailBase's
`_user` ids are unrelated, and guessing a mapping is forbidden
([[import-from-v1-drops-invoice-maker]]). The run log warns
`8,927 invoice(s) had invoice_maker set; that reference is dropped`.

**The decision is instead to attribute every migrated invoice to the user running the import** —
the person logged in to the guest when the import is executed. Not a match attempt, not a
per-account mapping: one attribution for the whole migration.

## What this changes, stated plainly

`invoice_maker` ends up meaning **two different things**, and that has to be visible rather than
implied:

| rows | `invoice_maker` means |
|---|---|
| imported from v1 | *imported by* the operator who ran the migration |
| created after cutover | *created by* the user who entered it |

The column is therefore **not** "who entered this invoice" for historical rows, and any report or
screen that presents it as authorship is wrong for those rows. The alternative reading — that the
operator genuinely "made" 8,927 invoices — is false and must not be recorded anywhere.

The benefit is that the column is no longer uniformly `NULL`, so "this invoice had an author" stays
answerable, and the loss is visible only to someone who assumes per-row provenance.

## Why it is a fifth option, not one of the four already listed

[[import-from-v1-drops-invoice-maker]] records four options: accept the loss, match by email,
preserve the old id in a side column, or drop the column. This is a different one and is cheaper
than all of them — it needs **no account matching, no account creation, no new column, and no schema
migration**, because the column, its FK and its index already exist:

```sql
"invoice_maker" BLOB REFERENCES "_user"("id") ON DELETE SET NULL
CREATE INDEX "idx_invoices_invoice_maker" ON "invoices" ("invoice_maker");
```

## The work

**CODE IN PLACE 2026-10-06; verification pending a browser re-import.** The three code subtasks are done
and the run does not need re-deriving:

- [x] **Resolve how the plugin learns the destination `_user` id.** Chosen: **a small guest endpoint** —
      `GET /session` (`runtime/ahscripts/routes/session/route.ts`) returns the CALLER's own
      `{id, hex, name}`. The host resolves `req.user` from the cookie OR the `Authorization: Bearer`
      header (`lib.rs`), so the plugin's bearer-authenticated call is answered. `route-kit.userId()`
      gives the dashed-UUID form the record API writes; `userHex()` the hex form. Verified live by
      `guest-smoke.mjs` (`GET /session returns the signed-in user's id`, 113/113).
- [x] **Set `invoice_maker` on import.** The `invoices` PLAN entry gained
      `invoice_maker: function (v) { return v ? operatorId : null; }`; `buildBody` already passes a
      function spec through untransformed, and the record API exposes `invoice_maker` (the `invoices`
      API has no column restriction). `operatorId` is resolved in `trailBase.login()` right after the
      auth token. Rows the source never attributed stay `NULL`.
- [x] **Replace the `droppedMakers` warning.** `state.droppedMakers` → `attributedMakers`, and the log
      now says the reference is *attributed to this import's operator*, not dropped.
- [ ] **Verify by count, not by eye.** Needs a browser re-import: `SELECT COUNT(*) FROM invoices WHERE
      "invoice_maker" IS NOT NULL` must be 8,927.
- [ ] **Confirm the FK holds.** Needs the same re-import: every attributed value must resolve against
      `_user`, not be dangling.
- [ ] **Say it in the UI.** Not started — the invoice screen / print view must not present `imported by`
      historical rows as `created by`.

## Constraints this must respect

- **Do not guess a per-account mapping.** The vault forbids silently rewriting a reference to a
  guessed target. A single honest attribution is not a guess; a per-row email match is.
- **Do not touch `backend/` or `frontend/`.** They are the parity oracle, and every run starts from
  a clean slate — depot deleted, re-imported, `WAL checkpoint` + `ANALYZE`
  ([[clean-slate-benchmark-cycle]], driven by `trailbase/tools/clean-slate.py`).
- **No new migration is needed**, which matters because editing an applied migration is a recorded
  failure mode here ([[trailbase-stale-depot-skips-migration]]). The column is already there.
- Run the import through the browser UI, as the plugin is browser-side by design
  ([[trailbase-client-side-migration-plugin]]).

## Related

- [[import-from-v1-drops-invoice-maker]] — the issue this resolves, and the four options it weighed.
- [[pos-0029-rebuild-v1-import-on-guest]] — the parent verification task.
- [[api-contract-trailbase]] — why `_user` cannot be expanded or read as a record.
