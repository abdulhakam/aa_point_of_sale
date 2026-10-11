---
title: "Payments relation filters (party) matched nothing"
type: issue
status: fixed
severity: major
created: 2026-10-11
updated: 2026-10-11
tags: [payments, filters, sql, guest, parity]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[ui-parity-run-2026-10-11]]", "[[data-model]]", "[[api-contract-trailbase]]"]
---

# Payments relation filters (party) matched nothing

**Status:** fixed 2026-10-11. Found while adding the cash-memo payments parity columns
([[ui-parity-run-2026-10-11]]).

## Symptom

`/payments?party=<id>` returned an empty list for every party. The `Party` filter (and any filter
compared against a relation id) silently matched nothing, so a filtered payments list looked like "no
payments" rather than "filter not applied".

## Cause

`app/lib/payments.js` `filteredQuery` compared the stored BLOB to the id's base64 TEXT:

```js
where.push("p.party = ?"); params.push(String(filters.party));
```

Relation columns are BLOBs and the id in a URL is base64url text, so `blob = text` never matches.
Verified directly: `SELECT COUNT(*) FROM payments WHERE party = ?` (base64) → 0, vs
`WHERE party = unhex(?)` (hex) → 24. And live: `/payments?party=<id>` → 0 rows.

Every other relation comparison in the app already decodes (`unhex(?)` or the spool's `blob:` binds);
this one did not.

## Fix

`filteredQuery` now decodes via a small `rel(column, value)` helper that binds `base64ToHex(value)`
against `column = unhex(?)`, and the new Area/Section/Booker filters use the same helper. Verified:
`?party=<id>` → 16 rows, `?area=<id>` → 2/3 rows for two small areas (the row window caps large sets).

## Note

This was not in the UI-parity residue; it was found by testing the filter while building the missing
columns. No gate covered a relation filter on this screen.
