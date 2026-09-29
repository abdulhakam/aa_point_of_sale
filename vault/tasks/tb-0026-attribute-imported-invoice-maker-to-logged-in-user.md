---
title: "Attribute imported invoices.invoice_maker to the logged-in operator instead of dropping it"
type: task
status: todo
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

- [ ] **Resolve how the plugin learns the destination `_user` id.** This is the one genuinely
      unknown. The plugin already authenticates to TrailBase — `POST /api/auth/v1/login` against
      `base`, storing the token at `index.html:227` — but `_user` is a **hidden** table that
      config.textproto deliberately does not declare as a record API, so there is no
      `/api/records/v1/_user` to read. Options to evaluate, cheapest first: the id carried by the
      auth token, `/api/auths/refresh`, or a small guest endpoint that returns the session user.
      **Whatever is chosen, verify it returns a `_user` id and not a token subject or a record id.**
- [ ] **Set `invoice_maker` on import.** In the `invoices` PLAN entry, write the resolved user id
      into the `invoice_maker` field for every row whose source `invoice_maker` was set. Rows whose
      source maker was `NULL` should stay `NULL` — that preserves "never had an author" as distinct
      from "attributed to the importer", and is the least inventive reading.
- [ ] **Replace the `droppedMakers` warning.** `index.html:498` counts
      `src.invoice_maker` and `index.html:535` logs the drop. That must become a count of
      *attributed* invoices, or the log will keep reporting a loss that no longer happens.
- [ ] **Verify by count, not by eye.** After a clean-slate import,
      `SELECT COUNT(*) FROM invoices WHERE "invoice_maker" IS NOT NULL` must equal
      `SELECT COUNT(*) FROM invoices WHERE "invoice_maker" IS NOT NULL` on the source — 8,927 on
      current data. Assert it in the run log so a future regression surfaces immediately.
- [ ] **Confirm the FK holds.** Every attributed value must resolve against `_user`; a dangling
      reference would be worse than `NULL`, because it would look answered and be wrong.
- [ ] **Say it in the UI.** The invoice screen and any print view that shows authorship must not
      claim these invoices were entered by the logged-in operator. This is the item most likely to
      be forgotten, and it is the one that turns a data choice into a false statement.

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
