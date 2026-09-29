---
title: TB-0020 Guest fingerprint-based data refresh
type: task
status: todo
priority: medium
created: 2026-09-26
updated: 2026-09-28
tags: [trailbase, wasm, rquickjs, data, cache, phase-5]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-fingerprint-refresh]]", "[[guest-app-host-port]]", "[[trailbase-host-jobs-module-never-called]]", "[[snapshot-persistence-hits-the-20s-deadline]]"]
---

# TB-0020 Guest fingerprint-based data refresh

Phase 5 (data): make the guest refresh incrementally instead of rebuilding lazily with no change
detection.

## Subtasks

- [x] Per-table fingerprints (`count:max(updated)`; count-only for link tables)
- [x] `refresh(db)`: diff, re-read changed tables, rebuild only affected **materialised** views
- [x] Full rebuild when nothing is materialised (after `full` invalidate)
- [x] `GET /reports/status` exposes `fingerprints`, `refreshedAt`, `lastRefresh{changed,rebuilt}`
- [x] `/reports/refresh` incremental by default, `?full=1` to invalidate first
- [x] Test: smoke asserts `changed` includes `sections` and `rebuilt` includes `refs` after a write
- [x] Report results cached in KV, keyed by a per-process nonce + snapshot version
      ([[guest-report-result-cache]]); smoke asserts a repeat is a hit
- [ ] KV report-cache eviction/TTL (old-version entries accumulate). The KV bridge is three
      text operations with no TTL, so this is a host gap as well
      ([[trailbase-host-jobs-module-never-called]] records the sibling gap: no background job runs)
- [ ] Materialise the views as SQLite tables (the plan's stronger option) — not done; the guest
      builds in JS and caches in memory. **Partly addressed** by
      [[snapshot-persistence-hits-the-20s-deadline]] (a persisted `mview` snapshot), which is not
      the same as tables but does survive the process
- [ ] A background refresh job — **blocked**: the host's `jobs` module is never called
      ([[trailbase-host-jobs-module-never-called]]), so the poller route is the only tick available

## Outcome

See [[guest-fingerprint-refresh]]. The guest smoke was **67/67** at the time and is **71/71** now.

> **Status corrected 2026-09-28: `done` -> `todo`.** The incremental refresh itself shipped and is
> verified, but three boxes above are open and one of them is now blocked by a host defect. A
> `done` with unticked boxes is worse than a `todo`, because it reads as "nothing left here".

## Related

- [[guest-fingerprint-refresh]] — the design and its limits.
- [[guest-app-host-port]] — the host this lives in.
