---
title: The spool's blob: bind decoder only accepted PADDED base64, so every id filter was dead
type: issue
status: fixed
severity: high
created: 2026-10-01
updated: 2026-10-01
tags: [trailbase, wasm, base64, reports, spool, filters]
related_to: ["[[spooling-report-rows-through-kv]]", "[[a-base64-alphabet-error-is-silent]]", "[[base64-id-decoder-accepted-one-alphabet]]", "[[guest-db-bridge-text-params-only]]", "[[api-contract-trailbase]]"]
---

# The spool's `blob:` bind decoder only accepted PADDED base64, so every id filter was dead

## The defect

`spool::bind_param` (`trailbase/tb-ah-run-js/src/spool.rs`) decoded a `blob:`-prefixed bind with
`base64::engine::general_purpose::URL_SAFE` — the **padded** engine:

```rust
let bytes = base64::engine::general_purpose::URL_SAFE.decode(encoded)
```

An id arriving from the app is the **unpadded** 22-character form (16 bytes of BLOB), because that is
what the app's own base64 helpers produce and what a query string carries. The padded engine rejects
those with `Invalid padding`, so `spool::run` returned an error before the query ran.

Introduced in `f449670 feat(trailbase): spool report rows through KV by address`.

## Why it was invisible for so long

- The **parity gate could not see it.** `verify-spool-reports.mjs` runs every statement with EMPTY
  filters, so no `blob:` bind is ever produced — and it inlines blob binds as `x'…'` hex literals
  rather than using the `blob:` prefix at all. The gate proved the SQL, not the bind path.
- The **bench could not see it.** `/bench/spool` passes empty filters too.
- The **report pages still rendered.** Only the totals statement runs before the rows statement, so
  the 500 appeared first, and it appeared as
  `Guest error: QuickJS library created a unknown error` — which names neither the statement nor the
  reason ([[trailbase-guest-error-string-opaque]]).

So: a report with no id filter was perfect, and the same report with `?party=<id>` was a 500.

## The fix

Strip any padding, then decode as `URL_SAFE_NO_PAD`. One branch covers both spellings, and neither
engine alone does:

```rust
base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(encoded.trim_end_matches('='))
```

## How it is caught now

`verify-spool-reports.mjs` gained a **bind gate**: for every report and every declared parameter it
runs the statement with a value that must match nothing (must return 0 rows) and, where a real busy id
exists, with a real value (must return strictly fewer rows but not none). Both wrong directions fail
loudly. 72 binds verified.

`tools/check-report-pages.mjs` then drives the LIVE pages with real ids from
`tools/sample-filter-ids.mjs` — the only layer that exercises `blob:` binds through the real host.

## The standing hazard

An id is 16 bytes of BLOB and the only way into a query string is base64url. Two consequences worth
keeping:

- **Never hand-type an id.** A typo produces a filter that matches nothing and looks like a broken
  report. `sample-filter-ids.mjs` exists for this.
- **Two spellings of base64 are now both accepted**, and `api::value_to_json` still emits the PADDED
  form while the app emits the unpadded one. That asymmetry is a permanent trap for any future
  decoder; `bind_param` is the only place it is currently handled.
