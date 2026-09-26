---
type: Checkpoint
status: Superseded
belongs_to:
  - "[[TrailBase Backend]]"
work_session:
  - "[[Work Session — Portable page-host compute — 2026-09-25]]"
works_on:
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
supersedes:
  - "[[Checkpoint — Page Host and Report Performance — 2026-09-25]]"
superseded_by:
  - "[[Checkpoint — Three-Server E2E Test — 2026-09-26]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
---

# Checkpoint — Portable Page-Host Compute — 2026-09-25

## Objective

Make declarative page data portable and efficient without another deployed platform: manifests select trusted named operations; the existing local worker-thread pool computes results from the warm TrailBase snapshot.

## Active tasks

- [[TB-0008 Serve report results from the page host instead of whole views]] — In Progress; code and seeded verification complete, live performance remeasurement pending.
- [[TB-0009 Retire the legacy report routes in favour of the page host]] — Blocked on TB-0008.

## Completed since previous checkpoint

- `/p/<slug>/data` now returns `{version, filters, result, meta}` instead of derived views.
- Applied filters are query parameters and part of the ETag; select-source tables remain in the payload.
- Browser page runtime now renders the result only; unused browser worker-pool files were removed.
- Added direct smoke assertions for result parity, no `views` payload, select sources and ETag revalidation.

## Current verified state

- `npm run smoke` → 59/59 checks passed.
- `python scripts/kb_check.py vault` → PASS, quality 100/100; all links resolve.
- `git diff --check` → no whitespace errors.
- No Redis, RabbitMQ, external queue, remote service or second deployment was added.

## Files and artifacts changed

- `frontend-ssr/src/routes/pages.js`
- `frontend-ssr/public/js/runtime/page.js`
- `frontend-ssr/public/js/runtime/{pool,worker}.js` removed
- `frontend-ssr/scripts/smoke.js`
- `frontend-ssr/README.md`
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
- [[Issue — Declarative pages ship whole views and are slower than server rendering]]
- [[TB-0008 Serve report results from the page host instead of whole views]]

## Decisions and assumptions that affect next steps

- Compute requests select a trusted manifest-declared report name; request-supplied JavaScript is not executed.
- CPU parallelism remains the local Node `worker_threads` pool. The page route is a coordinator, the report service owns snapshot aggregation, and MiniJinja stays in-process.
- Task frontmatter and actual measurements are authoritative over the project index or this checkpoint.

## Blockers and unresolved questions

- The 60,245-row live-dataset timings have not yet been repeated, so TB-0008 cannot be marked Done and TB-0009 remains blocked.

## Exact next action

Start the local TrailBase and frontend against the live dataset, measure the same ten page-host reports listed in [[Issue — Declarative pages ship whole views and are slower than server rendering]] using `window.__page`, compare each result with the recorded baseline, then update the issue and TB-0008 status based on evidence.

## Verification still required

- Re-measure payload sizes and end-to-end timings for all ten live reports.
- Verify every page route in a browser after the server-compute runtime change.

## Resume procedure

1. Read [[TrailBase Backend]] and this checkpoint.
2. Read [[TB-0008 Serve report results from the page host instead of whole views]] and the linked performance issue.
3. Inspect `frontend-ssr/src/routes/pages.js` and `frontend-ssr/public/js/runtime/page.js`.
4. Perform the exact live-performance measurement above before changing architecture or task status.
