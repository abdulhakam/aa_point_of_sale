---
title: TrailBase user ids are UUIDv4, so user-referencing tables must not require uuid_v7
type: issue
status: verified
severity: low
created: 2026-09-27
tags: [trailbase, users, schema, invoices, limitations]
related_to: ["[[tb-0021-invoices-cashmemos-printing]]", "[[invoice-entry-freshness-and-writes]]", "[[trailbase]]"]
---

# TrailBase user ids are UUIDv4, so user-referencing tables must not require uuid_v7

## What was found

TrailBase's `_user` rows use **UUIDv4** ids, not the uuid_v7 the rest of the schema uses:

```text
_user: id=78484f173e034524ad407a302ac0bc3d version=4 email=admin@localhost
```

Any table that references a user (the invoice edit lease, and later an audit/actor column) must not
carry `CHECK (is_uuid_v7(col))` on it. The first cut of `invoice_lock` did, and every lock write
failed with `CHECK constraint failed: is_uuid_v7("user")`.

Fixed by declaring the column `"user" BLOB NOT NULL` with no version check
(`trailbase/traildepot/migrations/main/U1790300200__create_invoice_entry_tables.sql`), while our own
ids (`invoice`, `line`) keep the uuid_v7 check.

Also note the id arrives over the guest API as a **canonical UUID string with dashes**
(`req.user().id`), not base64 like record ids — so it must be converted by stripping dashes, not by
base64-decoding (the invoice routes handle both shapes).

## Evidence

- `_user` row above, read from the depot's `main.db`.
- The migration and `runtime-js/site/ahscripts/routes/_app/route.ts` (`userHex`).

## Related

- [[invoice-entry-freshness-and-writes]] — the design with the user-referencing lock.
- [[tb-0021-invoices-cashmemos-printing]] — where it was hit.
