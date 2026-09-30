---
title: Every guest JS exception is reported to the client as 404
type: issue
status: open
severity: medium
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, errors, http, diagnostics]
related_to: ["[[trailbase-guest-error-string-opaque]]", "[[tb-0025-host-endpoint-hygiene]]"]
---

# Every guest JS exception is reported to the client as 404

## The finding

`trailbase/tb-ah-run-js/src/lib.rs:313-317`:

```rust
Err(e) => {
  // Return 404 if method not found or other error (simulating "otherwise return 404")
  // Ideally distinguish between "file not found" (handled above) and "method not found".
  return Err(HttpError::message(StatusCode::NOT_FOUND, format!("Route execution failed: {}", e)));
}
```

Any error out of `runtime::run_route` — an undefined variable, a bad SQL statement, a failed
template render, a null deref in a report — becomes **404** with the exception text in the body.
The `404` that legitimately means "no such route" and the `500` that means "the route threw" are the
same status.

## What it costs

This is the HTTP face of [[trailbase-guest-error-string-opaque]], which already records that the
guest's error *message* is an opaque JS string. The missing status code makes it worse:

- A genuine server-side fault looks like a typo in the URL. Anyone debugging by status code will
  chase routing rather than the route body.
- Report pages are the affected surface. `notes/new-system-report-timings.md` records `profit`,
  `itemsales` and `paymentsbycompany` failing on production-sized data — a 404 there reads as "that
  page does not exist", not "that page blew the 20 s deadline". That is a plausible contributor to
  how long the [[snapshot-persistence-hits-the-20s-deadline]] diagnosis took.
- The source comments on its own bug. The `// Ideally distinguish…` line is the upstream author
  acknowledging it.

## The fix

Map the error to `500 INTERNAL_SERVER_ERROR` and keep the 404 strictly for "no route file matched"
(the branch above, at `lib.rs:331-337`). A cheap interim improvement is to include the resolved
`file_path` in the body so the response says *which* route failed.

Tracked in [[tb-0025-host-endpoint-hygiene]].

## Evidence

- `trailbase/tb-ah-run-js/src/lib.rs:313-317` — the mapping and its admission; read 2026-09-28.
- `trailbase/tb-ah-run-js/src/lib.rs:218-220` — the guard that already distinguishes "file not found" for
  the 404 case.
- [[trailbase-guest-error-string-opaque]] — the same failure, one layer down.

## Related

- [[trailbase-host-api-mock-200-instead-of-404]] — the same handler, the mirror-image bug.
- [[snapshot-persistence-hits-the-20s-deadline]] — the failures most likely to surface this way.
