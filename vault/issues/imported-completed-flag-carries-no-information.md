---
title: "The imported `completed` flag carries no information — never backfill from it"
type: issue
status: open
severity: critical
created: 2026-09-29
updated: 2026-09-29
tags: [import, invoices, lifecycle, migration, data-model, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-lifecycle-draft-open-append-only]]", "[[guest-invoice-lifecycle]]", "[[returns-are-negative-quantities]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[import-from-v1-drops-invoice-maker]]", "[[data-model]]", "[[guest-depot-created-is-import-time]]", "[[trailbase-stale-depot-skips-migration]]"]
---

# The imported `completed` flag carries no information — never backfill from it

Found 2026-09-29 while adding the invoice lifecycle ([[guest-invoice-lifecycle]]). It is the most
dangerous kind of defect found so far, because it is silent: the code is correct, the data is
plausible, and the effect is a report that quietly returns almost nothing.

## What happened

`invoices.completed` is a 0/1 flag the guest's invoice-entry slice used as "this invoice is
finished". It was the obvious column to derive the new `invoices.status` from, so the first version
of the lifecycle migration backfilled:

```sql
UPDATE "invoices" SET "status" = CASE WHEN "completed" = 1 THEN 'open' ELSE 'draft' END;
```

Applied to the production depot it produced:

| status | invoices |
| --- | --- |
| `draft` | **8,923** |
| `open` | 12 |

Every report filters `status = 'open'` (that is the whole point of a draft — it is not in the
books). So that single line would have hidden 99.9% of the ledger: 8,508 invoices that have lines,
most of them settled and paid.

## Why `completed` is empty

`completed` is a **PocketBase form-state field**, not a business one. The v1 import mapped the
collections field for field and never set it, and no report ever filtered on it — the reports show
everything, which is exactly flaw **F1** in [[invoice-entry-freshness-and-writes]]. So the column is
`0` on 8,923 of 8,935 rows and `1` only on the 12 invoices the guest's own invoice-check harness
created.

The distribution on the production depot, measured directly:

| `completed` | invoices |
| --- | --- |
| 0 | 8,923 |
| 1 | 12 |

## The fix

Two migrations, both kept:

- `U1790400000__invoice_lifecycle_and_difference_party.sql` — corrected in place: **every existing
  invoice becomes `open`**, unconditionally, because every existing row is a historical document
  that is in the books. Only new invoices are drafts.
- `U1790400100__repair_invoice_status_backfill.sql` — repairs a depot that already ran the wrong
  version, which is the production one. It re-opens every row that has lines, and any row with a
  status outside the CHECK.

The wrong version stays in the history rather than being rewritten away, so the mistake and its
repair are both auditable ([[trailbase-stale-depot-skips-migration]] is the neighbouring hazard:
a migration that was edited after being applied is *silently skipped*).

## The rule this establishes

**Never derive a business state from a column that the import did not populate.** When a new
lifecycle column is added over imported data, the backfill is `open` for everything that exists and
the new state is for new rows only. `completed` is now kept purely as the legacy mirror the record
API contract needs, written in the same `UPDATE` as `status`, and is never read for behaviour.

This is the second time a flag that "looks populated" turned out not to be — the first was
`created`, which records the import time rather than the document's own date
([[guest-depot-created-is-import-time]]). **Audit a column's distribution before trusting it.**

## Evidence

- The `completed` distribution above, read from `traildepot/data/main.db` before the repair.
- The corrected backfill in `U1790400000`, and `U1790400100` for the already-migrated depot.
- The post-repair check: 8,935 `open`, 0 `draft` until the app creates one.

## Related

- [[invoice-lifecycle-draft-open-append-only]] — the `status` column this broke.
- [[guest-depot-created-is-import-time]] — the same class of defect, different column.
