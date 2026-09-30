---
title: The guest DB bridge binds text parameters only — numbers must be sent as strings
type: issue
status: verified
severity: medium
created: 2026-09-27
tags: [trailbase, wasm, rquickjs, database, api, limitations, invoices]
related_to: ["[[guest-writes-via-sql]]", "[[guest-app-host-port]]", "[[tb-0021-invoices-cashmemos-printing]]"]
---

# The guest DB bridge binds text parameters only — numbers must be sent as strings

## The limitation

The guest's DB bridge (`sqlite.execute` / `sqlite.all` / `db.query` / `db.execute`) is declared as

```rust
async fn execute_wrapper(sql: String, params: Opt<Vec<String>>) -> Result<i64>
```

so **every parameter must be a JS string**. Passing a number makes the rquickjs argument conversion
fail, and the call raises an opaque `InternalError: QuickJS library created a unknown error` with no
mention of the parameter.

Found while building invoice entry: `completeInvoice` passed the boolean as
`completed ? 1 : 0` and every call 500'd. The fix is `String(completed ? 1 : 0)` — but the failure
mode is invisible unless the bridge logs the underlying error.

## What it costs

- Any numeric/boolean parameter must be stringified by hand (`String(v)`, or the 2 dp `money()`
  helper), or the call fails with an unhelpful message.
- The failure is easy to misdiagnose as an SQL error, a CHECK constraint, or a component crash.

## Mitigations

- The bridge now **logs the real error** to stderr (`bridge error: …`, `db.execute error: …`,
  `sqlite.all error: …`) before mapping it to `Error::Unknown`; that is how this was found
  (`CHECK constraint failed: …` pointed at the schema, and the numeric-parameter failure showed up
  once the message was visible).
- Stringify numeric params (the app's `money()` helper already does this for money).
- A follow-up could accept a `Vec<Value>`/`serde_json::Value` for params so JS numbers bind
  natively.

## Evidence

- `trailbase/tb-ah-run-js/src/api.rs`, `trailbase/tb-ah-run-js/src/api/sqlite.rs` — the `Opt<Vec<String>>` signatures and
  the added error logging.
- `trailbase/runtime/app/lib/invoicing.js` — `completeInvoice` now passes `String(...)`.

## Related

- [[guest-writes-via-sql]] — the write path this constrains.
- [[tb-0021-invoices-cashmemos-printing]] — where it was hit.
