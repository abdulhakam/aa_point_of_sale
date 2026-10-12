---
title: The v1 importer drops invoices.invoice_maker
type: issue
status: known-limitation
severity: medium
created: 2026-09-26
tags: [migration, import, data-loss, invoice-maker, plugin]
related_to: ["[[trailbase-client-side-migration-plugin]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[pos-0029-rebuild-v1-import-on-guest]]"]
---

# The v1 importer drops invoices.invoice_maker

## What happens

The `import-from-v1` plugin ([[trailbase-client-side-migration-plugin]]) **does not migrate
`invoices.invoice_maker`**. Its own description says so explicitly. This was true of the Node
copy at `frontend-ssr/plugins/import-from-v1/` (deleted with `frontend-ssr` on 2026-09-27, in git
history) and remains true of the ported guest copy at
`trailbase/runtime/ahscripts/plugins/import-from-v1/`; fixing it is
[[pos-0029-rebuild-v1-import-on-guest]]:

> Drops `invoices.invoice_maker` (it points at PocketBase's `_user`, which TrailBase does not
> share).

In the schema, `invoices.invoice_maker` is a real, indexed column:

```sql
"invoice_maker" BLOB REFERENCES "_user"("id") ON DELETE SET NULL
```

and it has its own index, `idx_invoices_invoice_maker`. So the *column* exists and is ready — it is
the values that will not arrive.

## Why it happens

PocketBase records store a reference to a PocketBase `_user` record id. TrailBase has its **own**
`_user` table, populated from TrailBase's auth endpoints, with unrelated ids. There is no id
correspondence, and the two user tables have no shared natural key guaranteed to exist:

- TrailBase's auth is configured `user_identifier: REQUIRE_EMAIL` with an optional username, ≥ 8
  characters, no anonymous or OTP sign-in.
- There is no guarantee that the PocketBase admin/user accounts and the TrailBase accounts are the
  same people, or that they were created in TrailBase before the migration runs.

So the importer would have to match accounts **by email**, create any that are missing, and then
map ids — and it deliberately does not, rather than guessing (which is also the vault's rule:
never silently rewrite a reference to a guessed target).

## Consequences

- **Invoice authorship is lost.** After a migration, `invoice_maker` is `NULL` for every imported
  invoice, so "who made this invoice" is unanswerable for all history.
- **It is a silent-ish loss.** The plugin documented it in its `meta.md`, but nothing in the
  migration *output* reported how many invoices lost a maker, so it will not surface in a row-count
  reconciliation. The count is `SELECT COUNT(*) FROM invoices WHERE invoice_maker IS NOT NULL` on
  the source.
- **Expansion was never available anyway.** `invoice_maker` cannot be expanded even when set,
  because `expand` cannot reach a hidden (`_`-prefixed) table ([[api-contract-trailbase]]). So a
  reader of the TrailBase API could not have inlined the user record; it would always need a second
  lookup against the auth API. That makes the loss less severe than it first appears — but it is
  still a loss, not a design choice.

## Update (2026-09-27)

The importer still drops the value, but no longer silently: it now counts every invoice whose
`invoice_maker` was set and writes that count to the run log, so the loss shows up in the migration
output instead of only in this note. The production copy has `invoice_maker` set on all **8,927**
invoices. The underlying choice (accept vs. match-by-email) is recorded under
[[pos-0029-rebuild-v1-import-on-guest]].

## Options

1. **Accept it and document it** as a known, deliberate loss — the lowest-cost path, and defensible
   given the column was never expandable.
2. **Match by email** in the rebuilt plugin: read the PocketBase users, ensure a TrailBase user
   exists for each email (creating where needed, and reporting what it created), keep an id map,
   and set `invoice_maker` from it. Recoverable data, at the cost of the plugin creating accounts.
3. **Preserve the old id in a side column** (e.g. a nullable `invoice_maker_legacy` text column) so
   the information survives the migration and can be resolved later. Requires a schema addition —
   which means a *new* migration, not an edit to the applied one
   ([[trailbase-stale-depot-skips-migration]]).
4. **Decide the column is obsolete** and drop it from the schema, since nothing can read it through
   the API. This is the cleanest end state if authorship is genuinely not needed, and it removes a
   column that can never be expanded.

Option 1 or 4 is the honest minimum; option 2 is the one that actually preserves the data.

## Resolution (2026-09-29) — a fifth option was chosen

**Attribute every migrated invoice to the user logged in when the import runs.** Tracked as
[[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]], and **deferred far into the
future** — it is not on the critical path for the invoice and cash-memo work.

It sits outside the four above because it is cheaper than all of them: no account matching, no
account creation, no side column, and no schema migration, because the column, its FK and its index
already exist. The run log's `8,927 invoice(s) had invoice_maker set; that reference is dropped`
will become a count of attributed invoices.

The cost is a **semantic split** that has to stay visible: for imported rows `invoice_maker` means
*imported by*, for rows created after cutover it means *created by*. The alternative reading — that
the operator genuinely entered 8,927 invoices — is false and must not be stated anywhere.

The one genuinely open part is how the plugin learns the destination `_user` id: the plugin already
authenticates and holds a token, but `_user` is hidden and has no record API to read.

## Related decisions this touches

- [[trailbase-encode-enums-as-integer-codes]] — the other place the migration must translate values
  rather than copy them.
- [[trailbase-client-side-migration-plugin]] — the plugin's design, including why it runs in the
  browser.
- [[trailbase-pocketbase-data-compatibility]] — the general principle that what can be preserved
  cheaply is preserved; `invoice_maker` is the counter-example that was not cheap.
- [[pos-0029-rebuild-v1-import-on-guest]] — the guest verification, where `invoice_maker` must be
  handled explicitly rather than dropped again.

## Evidence

- `trailbase/runtime/ahscripts/plugins/import-from-v1/meta.md` — "Drops `invoices.invoice_maker` (it points
  at PocketBase's `_user`, which TrailBase does not share)." The Node copy with the same text is
  in git history (`frontend-ssr/plugins/import-from-v1/meta.md`). Fixing it is
  [[pos-0029-rebuild-v1-import-on-guest]].
- `trailbase/migrations/main/U1790208000__create_base_tables.sql` — the `invoice_maker`
  column and its `REFERENCES "_user"("id") ON DELETE SET NULL`, plus
  `CREATE INDEX "idx_invoices_invoice_maker"`.
- `trailbase/config.textproto` — `invoices` allow-lists `expand: ["type","party","booker"]` and
  **not** `invoice_maker`, with the surrounding comment explaining that a hidden `_user` table cannot
  be expanded.
- `trailbase/runtime/ahscripts/lib/data.js` — `RELATIONS.invoices = ["type","party","booker","invoice_maker"]`,
  i.e. the field is read and normalised, so the *client* handles it fine; only the migration omits it.
