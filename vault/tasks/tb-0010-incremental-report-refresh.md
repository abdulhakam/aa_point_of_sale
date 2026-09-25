---
type: Task
status: Done
ticket: TB-0010
priority: P1
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0004 Build the server-rendered TrailBase frontend]]"
  - "[[Issue — Report cache lag after a client-side import]]"
created: 2026-09-25T00:00:00.000Z
updated: 2026-09-25T00:00:00.000Z
tags:
  - trailbase
  - frontend
  - reporting
  - performance
---

# TB-0010 Refresh report views incrementally with a background job and an indicator

## Goal

Stop the report service re-reading all 17 tables and rebuilding all 14 views every 60 seconds, and show what
the refresh job is doing.

## Done when

- A background job probes each table's fingerprint, fetches only tables that changed, rebuilds only the views
  they feed, and re-renders only the reports that read a rebuilt view.
- A quiet tick does no fetch, no rebuild and no re-render.
- A management write invalidates exactly the tables it touched and refreshes immediately.
- A 4-colour indicator (gray idle / blue fetch / red process / yellow render) shows the job's phase, with
  counts while working and a summary when idle.
- Report output is unchanged: `npm run smoke` 55/55.

## Context

The report service held a snapshot of the base tables plus the derived views and refreshed it on a 60 s TTL,
re-reading ~60k rows (~1,000 rows/s sustained) and rebuilding every view even when nothing had changed;
`buildViews()` also ran on the main thread. See
[[Decision — Refresh the report snapshot incrementally from table fingerprints]].

The compute layer was extracted into `compute/` in the same pass so the browser could later run the same
files ([[Decision — Declarative pages: a folder is a page, the server is a generic host]]).

## Verification

- Focused harness, **18/18**: an out-of-band insert was detected by the probe alone; only `counts` and `refs`
  were rebuilt (heavy views untouched); a quiet tick did not rebuild but still checked; a management write
  invalidated its own table and rebuilt immediately; the indicator markup and polling script are served.
- **7/7**: `order=-updated` is honoured and an in-place update with an unchanged row count is detected.
- `npm run smoke` **55/55** after the refactor, twice.

## Related

- [[Decision — Refresh the report snapshot incrementally from table fingerprints]]
- [[Frontend — TrailBase Server-Rendered App]]
