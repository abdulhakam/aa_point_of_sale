---
title: Clean-slate benchmark cycle (reset, import, measure)
type: reference
status: active
created: 2026-09-28
system: new
tags: [trailbase, benchmarking, methodology, import, tooling, performance]
related_to: ["[[component-split-and-sql-materialised-tables]]", "[[pos-0029-rebuild-v1-import-on-guest]]", "[[report-performance-baseline]]", "[[trailbase-loads-multiple-components-flat-router]]"]
---

# Clean-slate benchmark cycle (reset, import, measure)

Three tools that together make a comparison reproducible: every run starts from a depot built
identically from scratch, so nothing carries over between runs.

```powershell
pwsh -File trailbase/tools/run-bench.ps1 -Runs 5 -Reps 8 -Limits 10000
```

Per run: stop server → delete `traildepot/data` → start server → set the admin password → import
→ **normalise the database** → benchmark. Results append to `trailbase/tools/bench-results.ndjson`.

## Why reset and re-import every run

Medians over a database that is growing between runs are not comparable. The depot accumulates a
persisted `mview` snapshot (82 MB across 14 rows on the full production copy), a page cache, KV
entries and WAL pages. A run measured after those exist is measuring a different machine state
from one measured before.

## `tools/import-from-v1.mjs` — the plugin's own code, headless

Runs `app/plugins/import-from-v1/index.html`'s inline script against a minimal DOM stub and calls
the `window.__mig.run()` entry point the page already exposes. **Nothing about the import is
reimplemented**, so the headless path cannot drift from the browser path — which matters because a
second implementation of the import would be a second thing to keep in parity.

Verified identical to the browser run: **60,245 / 60,245 records, 0 failures**, per-collection
`read == created`, 13 party links, 5 booker links, and the same 8,927 dropped `invoice_maker`.
It is faster than the browser (23–45 s, 1,300–2,600 rec/s) because it skips DOM rendering.

## `tools/split-bench.mjs` — the A/B, with a correctness gate

Interleaved arms, byte-equality asserted on every run, `--raw` to print every sample. The equality
gate matters: a timing comparison between two arms that compute different numbers is worthless.

## The variance problem this exposes, and the fix

**Run-to-run variance is the dominant effect, and it has to be removed before arms are compared.**
Before normalisation, two consecutive clean-slate runs of the identical configuration gave
inline 716 vs 426 ms and component 781 vs 436 ms — a 68% swing, because the freshly imported depot
has a large uncheckpointed WAL and a cold page cache. The component's own `query` time doubled with
it (61 → 157 ms), which is what identified the database, not the arms, as the cause.

`Normalize-Db` in `run-bench.ps1` therefore runs `PRAGMA wal_checkpoint(TRUNCATE); ANALYZE;` after
each import, before any measurement. After that the component's `query` is stable at 59–70 ms
across all five runs.

## Result of five normalised clean-slate runs

10,000 rows, 8 reps per arm, byte-identical HTML every rep. Paired per-run overhead, not arm medians
(see the aggregation caveat below):

| run | inline (warm) | component (warm) | overhead | inline (cold) | component (cold) | overhead |
|---|---|---|---|---|---|---|
| 1 | 440 ms | 428 ms | −2.7% | 552 ms | 517 ms | −6.3% |
| 2 | 696 ms | 475 ms | −31.8% | 468 ms | 486 ms | +3.8% |
| 3 | 629 ms | 527 ms | −16.2% | 458 ms | 453 ms | −1.1% |
| 4 | 443 ms | 450 ms | +1.6% | 625 ms | 599 ms | −4.2% |
| 5 | 455 ms | 446 ms | −2.0% | 465 ms | 464 ms | −0.2% |
| median paired | — | — | **−2.7%** | — | — | **−1.1%** |

The residual spread is entirely the **inline** arm, whose `acquire` swings 200–559 ms against the
component's stable 109–159 ms. The component's acquisition is ~2× faster in both cache regimes.

## Cold mode — attempted, then withdrawn as unachievable from the guest

`--cold` was implemented as `PRAGMA shrink_memory; PRAGMA cache_size = 1;` before the measured query,
and a five-run "cold" sweep was reported at −1.1% paired median. **That was wrong: the pragmas never
ran.** TrailBase's DB bridge rejects every PRAGMA ("pragmas not supported") through both `query` and
`execute`, verified through `/bench/pragma`, and both call sites swallowed the error, so `cold=1` was
a silent no-op and the numbers were warm. See
[[trailbase-guest-db-bridge-rejects-pragmas]].

There is **no way to flush SQLite's page cache from inside the guest**; the only genuine mechanism is
a fresh process. The cold implementation has been removed rather than left in place looking
functional, and the claim is withdrawn until a restart-per-measurement variant exists.

This does not undermine the arm comparison: both arms query the same database behind the same page
cache, so cache state scales both and cancels in the ratio.

## All-reports sweep

`split-bench.mjs --reports` sweeps every report in the app's own registry (14 of them) and measures
**three** arms, because two of them answer different questions:

| arm | what it does |
|---|---|
| `inline` | the app's own `readTable` — column lookup, select, **and per-row normalisation** |
| `raw` | the same rows with **no normalisation** — the identical work the component does, **the fair comparison** |
| `component` | rows acquired by `sql.wasm`, handed over by KV key, read back |

At real report volumes (33,601–60,186 rows, 7–15 tables) the result is unambiguous and stable across
repeats: **fair median +71.0%, component slower in 14/14 reports** (range +37% .. +99%), while the
end-to-end figure against `inline` is −31.0%.

The three arms show why: the component's own acquisition (1,499–1,671 ms) is as fast as a
like-for-like in-process read (1,722–2,111 ms), but the **handoff costs ~1.4 s per 60k rows**, and
`inline`'s 4,087–4,481 ms is mostly QuickJS per-row normalisation (~2.4 s) that the component simply
does not perform.

**Methodological rule:** when comparing two implementations, make sure they do the *same work*. The
`raw` arm exists solely because comparing `component` against `inline` would credit the split with
normalisation it does not do.

## Known limits

- The minutely `queue_poller` job calls `service.refresh(db)`, which builds the whole `mview`
  snapshot and can cross the ~20 s deadline. It fires during a run and can add noise; it is part of
  the real system, so it is not disabled.
- Only the `/bench/payload` route is measured: a payments×transactions join rendered through one
  template. This measures *acquisition, handoff and render*, not report arithmetic — so it cannot
  speak to the reports that exceed the guest deadline.
- The `inline` arm is existing code, not a separately built "composed" variant. The comparison is
  new-vs-existing rather than two new implementations.

## Evidence

- `trailbase/tools/run-bench.ps1`, `trailbase/tools/import-from-v1.mjs`,
  `trailbase/tools/split-bench.mjs`.
- Two-run console output, 2026-09-28 — the variance table above.

## Related

- [[component-split-and-sql-materialised-tables]] — the decision these timings inform.
- [[report-performance-baseline]] — the report-level (not transport-level) measurements.
