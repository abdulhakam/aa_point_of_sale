---
title: An id filter given a name instead of an id returns HTTP 500, not an empty report
type: issue
status: open
severity: low
created: 2026-10-01
updated: 2026-10-01
tags: [runtime-js, reports, spool, base64, errors, filters]
related_to: ["[[spool-blob-bind-decoder-rejected-unpadded-base64]]", "[[trailbase-guest-error-string-opaque]]", "[[report-sql-filters-on-text-enums-returns-nothing]]"]
---

# An id filter given a name instead of an id returns HTTP 500, not an empty report

## The defect

Every id-valued filter (`party`, `area`, `section`, `booker`, `company`, `item`) expects the
base64 BLOB id. Hand a filter the **name** instead and the request fails with a 500 and an internal
message, on both entry points:

```text
/reports/payments?party=120%20SHOP
  500  Guest error: totals statement failed for payments: blob: parameter is not valid URL-safe
       base64: Invalid symbol 32, offset 3.
/p/reports/payments/data?from=2020-01-01&to=2030-12-31&party=120%20SHOP
  500  same message
/reports/payments?party=AaDr_TV6dzOx7ykS49LJJA%3D%3D
  200  (the id form works)
```

Measured 2026-10-01 on `127.0.0.1:4000`.

## Root cause

The spool encodes every id bind as `blob:<base64>` and `spool::bind_param` decodes it strictly. A
name contains a space at offset 3, so the decode fails before the statement runs, and the error
propagates out of `totalsFor` as an unhandled guest error → 500.

This is the same class of failure as
[[spool-blob-bind-decoder-rejected-unpadded-base64]] (which was about the *padding* of a valid id);
here the input was never an id at all, so the decoder is behaving correctly and the **caller** is
what is missing.

## Why it is low severity

Nothing in the shipped UI produces this. Every id filter on `/reports/*` is a `<select>` whose
option values come from `filterOptions` (ids), and every id filter on `/p/*` is filled by
`page.js#fillSelects` from `row.id`. The 500 is only reachable by hand-editing a URL or bookmarking
one — which is exactly what happened here, because ids are 22-char base64 blobs that nobody types.

It is recorded because the failure mode is wrong: a bad filter value should be a 400 (or an empty
report), not a 500 with an internal decoder message. That is the "guest errors surface as 500"
pattern already tracked for SQLite errors in [[trailbase-guest-error-string-opaque]].

## Options

1. **Validate in `parseFilters` / `filtersFor`** — drop (or reject with 400) any id-bound filter
   whose value is not URL-safe base64. Small, local, and it makes the two entry points agree on
   what an id looks like.
2. **Make the decoder return a typed error** the host maps to 400 instead of letting it escape as
   a 500. Fixes the class rather than this one input.

Option 1 is cheaper and gives a better message; option 2 is the one that stops the next bad bind
from doing the same thing.

## Status

Open, unfixed, cosmetic-to-operational rather than user-visible. No shipped path reaches it.

## Evidence

- `trailbase/tb-ah-run-js/src/spool.rs` — `bind_param` decodes the `blob:` prefix.
- `trailbase/runtime/app/views/partials/filters.html` — option values are `o.value` = `String(r.id)`.
- `trailbase/runtime/app/public/js/runtime/page.js:66-71` — `fillSelects` sets `option.value = row.id`.
- The fetch sweep above, run against `http://127.0.0.1:4000` on 2026-10-01.