---
title: The materialised store cannot live in a separate database — SQLite triggers cannot write cross-database
type: issue
status: resolved
severity: high
created: 2026-09-29
updated: 2026-09-29
tags: [materialised, sqlite, triggers, schema, atomicity, wal, design]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[component-split-and-sql-materialised-tables]]", "[[invoice-document-parity-2026-09-29]]", "[[document-model-bench-2026-09-29]]", "[[data-model]]", "[[report-enum-translation-2026-09-29]]"]
---

# The materialised store cannot live in a separate database

Asked 2026-09-29, with the `STORED` document approach chosen: can the materialised cache be a
**separate database**?

**No, and the primary blocker is absolute rather than a matter of preference.**

## Blocker A — a trigger cannot write to an attached database (decisive)

SQLite rejects qualified table names in the body of a trigger, for every attached database:

```
CREATE TRIGGER t AFTER INSERT ON invoices
BEGIN INSERT INTO cache.inv_docs (id, total) VALUES (NEW.id, NEW.n*2); END

  trigger writing to cache.inv_docs:    REJECTED
  trigger writing to "cache"."inv_docs": REJECTED
  -- qualified table names are not allowed on INSERT, UPDATE, and DELETE
  -- statements within triggers
```

This is not a configuration or a version issue. **It forecloses a separate database outright** for
the tier-2 design, because tier 2 is defined by *trigger* maintenance in the *same transaction* as
the base write. If the derived rows live in another file, no trigger can reach them.

## Blocker B — cross-database atomicity is not guaranteed in WAL mode

SQLite's docs, ATTACH §5 "Transaction Control": *"Transactions involving multiple attached
databases are atomic, assuming that the main database is not `:memory:` and the journal_mode is not
WAL."*

The depot runs in **WAL** mode, so the guarantee is explicitly void there.

Measured, honestly: an application-level two-database transaction did **not** tear on `ROLLBACK` in
either journal mode (`DELETE` atomic, `WAL` atomic). That test does **not** establish the
guarantee — a happy-path rollback cannot exercise the case the restriction is about, which is a crash
or power loss between the two files' commits. The documentation is the authority on what is
*guaranteed*, and it excludes WAL.

## What a separate database would actually buy, and at what price

It is technically possible to write both files from application code inside one transaction, and
that path does not tear under test. The price is the entire point of the design:

- Freshness would depend on **every** write path in the guest doing the right thing, on every code
  path, forever. That is precisely the fragility trigger maintenance exists to eliminate.
- A missed write is not a stale cache that refreshes — it is a wrong money number with no error
  message.

So the trade is: a tidy file boundary in exchange for the guarantee that makes the materialised
store safe for the money screens. Not worth taking.

## The answer: same database, separate tables

Logical separation is available without any of the above cost:

| want | how |
|---|---|
| a distinct namespace | table names — `inv_doc` today, `mt_*` for the aggregate tier |
| a separate export or backup | `VACUUM INTO 'cache.db'` — a consistent snapshot, no trigger involvement |
| genuinely non-relational data | TrailBase's own KV store, which already exists |
| a schema the base tables cannot touch | a migration creating `inv_doc` with no FK *to* it; base tables do not reference it |

The single-depot layout is also what the guest's `db.execute` can reach: the WASM guest executes
against the connected database, so a table in the depot is directly addressable and an attached file
would need plumbing the guest does not currently expose.

## The rest of the requested semantics are already measured

From [[invoice-document-parity-2026-09-29]] and [[document-model-bench-2026-09-29]]:

| requirement | measured |
|---|---|
| full documents refresh rebuilds every object from the base tables | **1.9 s** — 1.2 s shadow build + 0.66 s atomic swap, single transaction, no reader sees a half-built table |
| an update or delete touches only that object and recalculates it | **2.5 ms** per line insert, trigger fires, document's `total` and `lines` both corrected in the same transaction |
| usable for the realtime/invalidated-everytime screens | Outstanding **75–156 ms** for 602 parties, single-invoice read **0.0 ms** — and one primary-key read, so the invoice screen needs no joins at all |

The one measured cost to plan around: TrailBase subscriptions return **403**, so "realtime" is
polling, not push ([[trailbase-subscribe-endpoint-forbidden]]). This design makes that polling cheap
rather than making it unnecessary.

## Related

- [[component-split-and-sql-materialised-tables]] — the tier model this implements.
- [[invoice-document-parity-2026-09-29]] — the verified prototype and its money parity.
