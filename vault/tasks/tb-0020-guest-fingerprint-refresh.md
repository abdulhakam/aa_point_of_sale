---
title: TB-0020 Guest fingerprint-based data refresh
type: task
status: done
priority: medium
created: 2026-09-26
tags: [trailbase, wasm, rquickjs, data, cache, phase-5]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-fingerprint-refresh]]", "[[guest-app-host-port]]"]
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
- [ ] KV report-cache eviction/TTL (old-version entries accumulate)
- [ ] Materialise the views as SQLite tables (the plan's stronger option) — not done; the guest
      builds in JS and caches in memory
- [ ] A background refresh job (the queue poller could also call `/reports/refresh`)

## Outcome

See [[guest-fingerprint-refresh]]. The guest smoke is **67/67**.

## Related

- [[guest-fingerprint-refresh]] — the design and its limits.
- [[guest-app-host-port]] — the host this lives in.
