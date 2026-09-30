---
title: The guest answers any unmatched `/api/...` URL with a fabricated 200
type: issue
status: open
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, endpoints, mock, parity, debugging]
related_to: ["[[api-contract-trailbase]]", "[[guest-app-host-port]]", "[[tb-0025-host-endpoint-hygiene]]"]
---

# The guest answers any unmatched `/api/...` URL with a fabricated 200

## The finding

`trailbase/tb-ah-run-js/src/lib.rs:321-329`, after the dispatcher has found no route file:

```rust
// Fallback for API mock or just 404
if path.starts_with("/api") {
  let body = serde_json::json!({
      "status": "success",
      "message": "This is a valid API route",
      "path": path
  });
  return Ok(Json(body).into_response());
}
```

So `GET /api/records/v1/nonexistent`, or any typo under `/api/`, returns **HTTP 200** with
`{"status":"success","message":"This is a valid API route"}` instead of a 404. It is another piece
of Phase-0 scaffolding ([[trailbase-guest-wasm-spike-results]]), kept to prove the guest could
answer on arbitrary paths.

## What it costs

Parity and integration work is exactly when it misleads. A client written against the legacy
PocketBase shape calls a route that does not exist, receives `200` with a plausible JSON body, and
carries on with undefined data instead of failing loudly. [[guest-app-host-port]] ran the
Node-vs-guest differential this way; [[api-contract-trailbase]] documents the endpoint contract this
quietly violates. It also hides genuine regressions: a renamed or moved app route reads as success
rather than as a 404 you would have caught.

## The fix

Delete the block so unmatched paths fall through to the real 404 at `lib.rs:331-337`, which already
produces `{"code": 404, "message": "Route not found", "path": …}`.

Tracked in [[tb-0025-host-endpoint-hygiene]].

## Evidence

- `trailbase/tb-ah-run-js/src/lib.rs:321-337` — the mock and the 404 it shadows; read 2026-09-28.
- `trailbase/tb-ah-run-js/src/lib.rs:207-216` — the dispatcher fallback that means almost every path
  resolves anyway, so the mock only fires for `/api/...` typos.

## Related

- [[trailbase-host-js-error-reported-as-404]] — the same handler, the mirror-image bug.
- [[tb-0025-host-endpoint-hygiene]] — the cleanup task.
