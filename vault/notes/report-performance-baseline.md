---
title: Report performance baseline (for future comparison)
type: note
status: active
created: 2026-09-28
updated: 2026-09-28
tags: [reports, performance, baseline, benchmark, guest, trailbase]
related_to: ["[[new-system-report-timings]]", "[[snapshot-persistence-hits-the-20s-deadline]]", "[[guest-report-performance-options]]", "[[reports-and-ledgers]]", "[[trailbase-guest-cpu-js-limits]]"]
---

# Report performance baseline (for future comparison)

**Purpose:** a fixed, reproducible measurement to compare any future report-engine change against.
Re-run the same method and environment before/after a change; do not compare numbers taken with a
different filter, depot, or thread count.

## Environment (do not change when comparing)

| | |
|---|---|
| Date | 2026-09-28 |
| TrailBase | `v0.33.22-0-g3dfb2f70 2026-09-23` |
| Component | `runtime_js` (runtime-js guest), **4 runtime threads** |
| Depot | `trailbase/traildepot`, production import: **60,186–60,274 rows**, 16 tables, 14 views |
| Server | `trail --depot=traildepot run --runtime-root-fs=traildepot/runtime --address=127.0.0.1:4000` |
| Login | `admin@localhost` / `administrator-0ne` |
| Snapshot | materialised to `mview` / `mview_meta` (see [[snapshot-persistence-hits-the-20s-deadline]]) |

**Depot caveat:** the depot's `created` column is the *import timestamp*
([[guest-depot-created-is-import-time]]), so every report is measured with a wide range that
includes all rows (`from=2021-05-05&to=2031-05-05`) — a fresh filter value each run so the KV report
cache is a miss on the "cold" hit.

## Method

1. Restart the server (clears the per-thread QuickJS snapshot; `mview` persists).
2. Log in, then for each report issue the URL twice with the same **fresh** filter:
   `cold` = first hit (cache miss), `repeat` = immediate second hit (KV report-cache hit).
3. 45 s client timeout. A `500` at ~20 s is the guest call deadline, not a slow success.

```js
const W="from=2021-05-05&to=2031-05-05";        // fresh key each baseline run
for (const [n,p] of reports) {
  const t1=Date.now(); const r1=await fetch(BASE+p,{headers:{cookie}}); await r1.text();
  const t2=Date.now(); const r2=await fetch(BASE+p,{headers:{cookie}}); await r2.text();
  console.log(n, `cold=${r1.status}@${t1-now}ms`, `repeat=${r2.status}@${Date.now()-t2}ms`);
}
```

## Baseline — after materialised snapshot (2026-09-28)

| report | cold (cache miss) | repeat (KV cache) | payload |
|---|---|---|---|
| stockreport | 1,921 ms | 46 ms | 48 KB |
| difference | 4,462 ms | 47 ms | 36 KB |
| ledgers/area | 7,690 ms | 161 ms | 139 KB |
| salesreport | 1,602 ms | 1,002 ms | 2.1 MB |
| payments | 4,750 ms | 2,707 ms | 6.5 MB |
| ledgers/general | 19,863 ms | 3,473 ms | 6.2 MB |
| profit | **500 @ 20 s** | 16,871 ms | 8.5 MB |
| itemsales | **500 @ 10 ms** (wedged) | 17,341 ms | 7.9 MB |
| paymentsbycompany | **500 @ 20 s** | **500 @ 20 s** | — |

Notes: large repeats stay 1–3 s because the KV hit still parses a multi-MB HTML/result; `profit`/
`itemsales` are non-deterministic at the deadline (a first hit that dies mid-build can leave the
runtime wedged, so the next call fails fast). `paymentsbycompany` never fits.

## Update 2026-09-28 — rendered-page cache (attack (c) on the hot path)

A generic rendered-page cache was added (see [[rendered-page-cache]]): a report page is keyed by the
**live data fingerprint + viewing identity + report + filters** and stored in SQLite, so a repeat
view is one read + transfer instead of a compute + minijinja render of every row.

| report | repeat before | repeat after | repeat2 |
|---|---|---|---|
| stockreport | 46 ms | 67 ms | 35 ms |
| difference | 47 ms | 67 ms | 25 ms |
| ledgers/area | 161 ms | 130 ms | 74 ms |
| salesreport | 1,002 ms | 334 ms | 283 ms |
| payments | 2,707 ms | 652 ms | 1,248 ms |
| ledgers/general | 3,473 ms | 1,265 ms | 1,285 ms |
| profit | 16,871 ms | 16,990 ms¹ | **1,500 ms** |
| itemsales | 17,341 ms | 1,004 ms | 1,172 ms |
| paymentsbycompany | 500 | 500 | 500 |

¹ the first repeat was itself the cold build that populated the cache; the second repeat is the
cached page.

**Cold is unchanged** (e.g. ledgers/general 12,967 ms, itemsales 16,598 ms) and
`paymentsbycompany` still never completes. Reducing cold cost needs the row-shaping/render to leave
QuickJS — SQL aggregation, a row cap/pagination, or a native compute path
([[guest-report-performance-options]]), not caching.

## Update 2026-09-28 — direct JS→serde render bridge (disproved)

Making `render.html` accept the JS context object and convert it to serde directly (skipping the
JSON string) was implemented and measured: **no win, and slower for the largest context**
(`payments` cold 5,528 → 9,277 ms). The caller was reverted to `JSON.stringify`; the bridge
capability remains available. See [[direct-js-serde-bridge-no-win]]. So the JSON boundary is not a
useful target; cold cost stays shaping + render.

## Complete test 2026-09-28 — all reports, cold + repeat, with the render row cap

[[report-render-row-cap]] caps a report page at 1,000 rendered rows (totals over all rows).
Fresh filter, clean server, `?all` not set:

| report | cold before cap | cold after cap | repeat after cap |
|---|---|---|---|
| stockreport | 81 ms | 2,079 ms¹ | 50 ms |
| difference | 53 ms | 4,386 ms¹ | 77 ms |
| ledgers/area | 1,770 ms | 8,404 ms¹ | 66 ms |
| salesreport | 3,244 ms | **798 ms** | 71 ms |
| payments | 6,184 ms | **2,218 ms** | 79 ms |
| dailysale | 2,421 ms | **680 ms** | 38 ms |
| outstanding | 206 ms | 4,632 ms¹ | 79 ms |
| productsale | 438 ms | 339 ms | 24 ms |
| ledgers/general | 500 @ 20 s | 19,268 ms | 97 ms |
| paymentsbycompany | 500 @ 20 s | 19,499 ms | 97 ms |
| itemsales | 500 @ 20 s | **500 @ 20 s** | 13,225 ms |
| profit | 500 @ 20 s | **500 @ 20 s** | 13,978 ms |

¹ the small/light reports fluctuate and can look slower on a cold thread because their cold cost is
per-thread view **hydration**, not render — treat the small-report cold column as noisy, not a
regression sign.

**Conclusion:** the cap fixes the **render**-bound reports (salesreport/payments/dailysale, and it
unblocks paymentsbycompany/ledgers/general from 500). `ledgers/general`, `paymentsbycompany`,
`itemsales` and `profit` remain ~19–20 s cold **even at 1,000 rendered rows**, so their cost is the
**JS computation** over every row; that needs the SQL/native cold path
([[guest-report-performance-options]]).

## Baseline — before the materialised snapshot (same depot, earlier this session)

| report | in-memory per-thread | persisted snapshot |
|---|---|---|
| stockreport | 86 ms warm | 1,921 ms cold / 46 ms repeat |
| difference | 104 ms | 4,462 ms / 47 ms |
| ledgers/area | 99 ms | 7,690 ms / 161 ms |
| salesreport | 1,257 ms | 1,602 ms / 1,002 ms |
| payments | 3,877 ms | 4,750 ms / 2,707 ms |
| ledgers/general | 4,093 ms | 19,863 ms / 3,473 ms |
| itemsales | **500 @ 20 s** | 500 cold / 16,871 ms repeat |
| profit | **500 @ 20 s** | 500 cold / 16,871 ms repeat |
| paymentsbycompany | **500 @ 20 s** | **500 @ 20 s** |

## Legacy reference (PocketBase `:8090` + Next.js `:3000`, same data)

| report | legacy |
|---|---|
| stockreport | 1,384 ms |
| difference | 992 ms |
| heavy reports | > 65 s |

## Known limits that dominate any future measurement

- The guest's **~20 s per-call deadline** is fixed (no config flag); `profit`/`itemsales`/
  `paymentsbycompany` sit on or over it.
- The cost is QuickJS per-row shaping + multi-MB JSON crossing + the minijinja render of ~21k rows
  ([[trailbase-guest-cpu-js-limits]]), not view *building* alone.
- The four runtime threads each hold their own QuickJS state, so the in-memory snapshot is
  per-thread; the SQLite store is what makes a build shared.
- A deadline kill can wedge the runtime (`wstd` `ConnectionReset` panic) until restart.

## Reproduce / compare

Re-run the method above on the same depot and thread count. Record cold **and** repeat, and state
the payload size, because a change that only helps (or hurts) the repeat path is easy to misread.

## Related

- [[snapshot-persistence-hits-the-20s-deadline]] — why the persisted snapshot does not clear the deadline.
- [[guest-report-performance-options]] — the ranked options any comparison should be judged against.
