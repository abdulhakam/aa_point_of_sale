---
title: The guest's `GET /count/{table}` is unauthenticated and interpolates the table name into SQL
type: issue
status: resolved
severity: high
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, security, sql, auth, host, endpoints]
related_to: ["[[api-contract-trailbase]]", "[[trailbase-auth-status-doc-mismatch]]", "[[guest-outbound-http-and-login]]", "[[trail-runtime-js-reference]]", "[[tb-0025-host-endpoint-hygiene]]"]
---


## RESOLVED 2026-10-01

`GET /count/{table}` is now **authenticated**, and the table name is constrained to a bare
identifier before it reaches the statement builder. Both halves were needed: the auth gate closes the
exposure, and the identifier check makes the interpolation safe, because SQLite cannot bind an
identifier and a bound parameter in `FROM` would be a constant string.

A missing table is now a **404** rather than a 500, and a real table returns its real count. The
endpoint used to answer `0` for `invoices`, which held 8,935 rows — it was wrong as well as open.

Verified on the running server, 2026-10-01:

```text
anon   /count/invoices                              -> 401  authentication required
authed /count/invoices                              -> 200  Got 8935 rows
authed /count/payments                              -> 200  Got 26526 rows
authed /count/nope                                  -> 404  no such table
authed /count/invoices; DROP TABLE pagecache        -> 400  not a table name
```

`pagecache` was still present afterwards, and the depot's own counts agree with the endpoint's.

# The guest's `GET /count/{table}` is unauthenticated and interpolates the table name into SQL

## The finding

`trailbase/tb-ah-run-js/src/lib.rs:46-60` registers a route straight from the upstream host's self-test
surface, ahead of the wildcard:

```rust
routing::get("/count/{table}", async |req| {
  let table = req.path_param("table").ok_or_else(|| internal("missing {table}"))?;
  let rows = query(format!("SELECT COUNT(*) FROM {table}"), []).await.map_err(internal)?;
  let Value::Integer(i) = rows[0][0] else { panic!("expected integer"); };
  return Ok(format!("Got {i} rows\n"));
}),
```

Two problems, both live:

- **No identifier quoting and no allow-list.** The path segment is interpolated into the statement
  text. `?table=` is not even needed — the value is in the path, so any client can reach it.
- **No auth gate.** The handler is registered before `routing::get("/{*wildcard}", …)`, so it is
  matched directly and never passes through the dispatcher, which is where the app's own auth
  check lives.

This contradicts the rest of the system: `config.textproto` states plainly that "Nothing here is
public: an unauthenticated request gets 401" (see [[trailbase-auth-status-doc-mismatch]]), and
[[api-contract-trailbase]] documents the same. `/count/` is the one endpoint that is public.

## What it costs

- **Row counts of every base table, to anyone who can reach the port.** The server binds
  `127.0.0.1:4000` by default ([[offline-local-deployment]]), so today this is a same-machine
  disclosure; it becomes a remote one the moment the bind address changes.
- **A `panic!` inside a guest.** A non-integer first column takes the `else` branch and panics.
  [[snapshot-persistence-hits-the-20s-deadline]] and [[report-performance-baseline]] both record
  that a panic in this guest is not a clean failure — the `wstd` bridge panics on client
  disconnect, so a wedged guest is a wedged server, not a 500.
- **It is upstream debug scaffolding.** The route exists to answer "can the guest reach the
  database?" during the Phase-0 spike ([[trailbase-guest-wasm-spike-results]]). Nothing in the app
  calls it.

## The fix

Delete the route. Nothing uses it, and deleting it is strictly better than gating it — an
unauthenticated row-count endpoint is not a capability any POS app needs. If a count is genuinely
needed later, it belongs behind the dispatcher's auth check, with the table name checked against
the `TABLES` list already in `trailbase/runtime/app/lib/data.js` rather than interpolated.

Tracked in [[tb-0025-host-endpoint-hygiene]].

## Evidence

- `trailbase/tb-ah-run-js/src/lib.rs:46-60` — the route, read 2026-09-28.
- `trailbase/tb-ah-run-js/src/lib.rs:40-44` — the wildcard registration it precedes.
- `trailbase/config.textproto`, the `record_apis` comment block — the "401 for unauthenticated"
  claim this contradicts.
- Grep of `vault/` for `/count/`: one unrelated hit in a captured `trailbase.js` listing, so this
  endpoint is documented nowhere.

## Related

- [[tb-0025-host-endpoint-hygiene]] — the cleanup that removes this and three siblings.
- [[api-contract-trailbase]] — the contract this violates.
- [[trail-runtime-js-reference]] — the host, whose upstream scaffolding this is.
