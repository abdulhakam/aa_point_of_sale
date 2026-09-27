---
title: SQLite errors from a guest are opaque; read err.payload, not Error.message
type: issue
status: known-limitation
severity: medium
created: 2026-09-26
tags: [trailbase, wasm, guests, errors, transactions, limitations]
related_to: ["[[trailbase-guest-wasm-spike-results]]", "[[api-contract-trailbase]]"]
---

# SQLite errors from a guest are opaque; read `err.payload`, not `Error.message`

## The limitation

When a statement inside a guest `Transaction` raises a SQLite error, the thrown value is an
`Error` whose message stringifies the payload as `[object Object]`:

```text
GET /spike/err ->
{"s":"Error: [object Object] (see error.payload)",
 "name":"Error",
 "message":"[object Object] (see error.payload)",
 "payload":"{\"tag\":\"other\",\"val\":\"Rusqlite: UNIQUE constraint failed: _spike_err.id\"}",
 "keys":["payload"]}
```

- `String(err)` / `err.message` are **not** usable for branching.
- The stable, machine-readable detail is `err.payload` — `JSON.parse(error.payload)` or read the
  `payload` property — carrying `{tag, val}`; `Object.keys(err)` is exactly `["payload"]`.

A second-property claim made by the same test, for context: `UPDATE … RETURNING` inside a
`Transaction` is correct and atomic. Claiming an already-leased row returns **no rows**, not an
error, so a job claim can be `rows.length === 1`.

## What it costs

- The plan's S7 asked whether atomic job claim has "stable error strings". It does not: job
  reconcile/retry logic must inspect `err.payload.tag`/`err.payload.val`, and the retryable-vs-
  terminal distinction has to be built on those tags rather than on message text.
- Comparing against TrailBase's own record-API error strings (e.g. `400 db constraint: fk`,
  `400 db constraint: unique` — [[api-contract-trailbase]]) is not a substitute; those come from
  the HTTP layer, not from a guest-side `Transaction`.

## Evidence

- `guests/src/index.ts` — `/spike/tx` and `/spike/err`.
- [[trailbase-guest-wasm-spike-results]] § S7, with the full response bodies.
- Runtime `trail v0.33.22-0-g3dfb2f70`, `trailbase-wasm@0.6.0`.

## Related

- [[api-contract-trailbase]] — the record-API error strings (a different layer).
- [[trailbase-guest-wasm-runtime-defaults]] — the jobs design that depends on this.
