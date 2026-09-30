---
title: TB-0025 Remove or gate the guest's leftover upstream debug endpoints
type: task
status: todo
priority: high
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, wasm, host, security, cleanup, endpoints]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[trailbase-host-count-endpoint-sql-injection]]", "[[trailbase-host-api-mock-200-instead-of-404]]", "[[trailbase-host-js-error-reported-as-404]]", "[[trailbase-host-getscripts-reads-wrong-root]]", "[[trailbase-host-jobs-module-never-called]]", "[[trailbase-host-settimeout-blocks-and-no-setinterval]]", "[[trailbase-host-fs-binary-read-and-std-fs-bypass]]", "[[runtime-js-guest-platform]]", "[[tb-0017-adopt-trail-runtime-js]]"]
---

# TB-0025 Remove or gate the guest's leftover upstream debug endpoints

A 2026-09-28 sweep of `trailbase/tb-ah-run-js/src/` for gaps the vault does not record found four routes and
two modules that came in with the upstream `runtime-js` crate
([[trail-runtime-js-reference]]) and were never reconciled with what this app actually needs. Three
of them are actively misleading; one is a security hole.

| # | Item | Note | Verdict |
|---|---|---|---|
| 1 | `GET /count/{table}` — unauthenticated, table name interpolated into SQL, `panic!` on non-integer | [[trailbase-host-count-endpoint-sql-injection]] | **delete** |
| 2 | `GET /api/...` fallback returning a fabricated `200 {"status":"success"}` | [[trailbase-host-api-mock-200-instead-of-404]] | **delete** |
| 3 | every JS exception returned as `404` | [[trailbase-host-js-error-reported-as-404]] | **map to 500** |
| 4 | `GET /getscripts` reading `/traildepot/ahscripts` | [[trailbase-host-getscripts-reads-wrong-root]] | **delete, or repoint at `/ahscripts`** |
| 5 | `jobs.rs` entirely uncalled; init-gating never runs | [[trailbase-host-jobs-module-never-called]] | **owner decision: delete or wire** |
| 6 | `setTimeout` sleeps, `setInterval` absent | [[trailbase-host-settimeout-blocks-and-no-setinterval]] | **document** |
| 7 | `fs` binary read silently stringified; half the API bypasses the WASI bridge | [[trailbase-host-fs-binary-read-and-std-fs-bypass]] | **fix or document** |

## Why one task rather than seven

They are one decision each but one *pass* over the same file, they all have the same reviewer, and
splitting them means seven rebuild cycles of a ~7 MB WASM component to delete some scaffolding.
Item 1 should not wait for the others — it is the only one reachable by an unauthenticated client.

## Checklist

- [ ] Remove `routing::get("/count/{table}", …)` — `host/src/lib.rs:46-60`
- [ ] Remove the `/api` mock so unmatched paths reach the real 404 — `host/src/lib.rs:321-329`
- [ ] Return `500` from `run_route` errors, keep `404` for "no route file matched" —
      `host/src/lib.rs:313-317`; include the resolved `file_path` in the body
- [ ] Delete or repoint `/getscripts` — `host/src/lib.rs:109-115`
- [ ] Decide `jobs.rs`: delete it and the `ensure_global_init` chain, or call it from
      `job_handlers` and root-cause the discovery bug. Record the choice in
      [[trailbase-runtime-js-scheduler-not-running-jobs]]
- [ ] Document `setTimeout` as blocking and `setInterval` as absent in `host/README.md` and
      [[runtime-js-guest-platform]]; point at the job queue as the real deferral mechanism
- [ ] Make `readFile({encoding:"binary"})` return bytes or reject; route `exists`/`readdir`/
      `writeFile` through the same bridge as `readFile`, or state why not
- [ ] `cmd /c trailbase\build.bat` then `node trailbase/tools/guest-smoke.mjs` — expect **71/71**
- [ ] Refresh [[guest-parity-differential-not-reproducible]]'s status if item 2's removal changes
      any harness result

## Note on `trailbase/tb-ah-run-js/README.md`

The same sweep falsified three of that file's six "Not done yet" bullets (real `fetch`, the
HTML/static response shape, the handler cache) and the `db.execute` alias claim. Correct the README
in the same pass — it is the file a new reader trusts most, and it is currently describing a host
that no longer exists.
