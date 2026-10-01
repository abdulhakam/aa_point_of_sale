---
title: guest-smoke report-total checks fail on a pristine checkout (pre-existing)
type: issue
status: open
created: 2026-10-01
updated: 2026-10-01
tags: [guest, smoke, reports, totals, parity, flake]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[payments-report-totals-computed-from-display-rows]]", "[[report-parity-flakes-on-float-arithmetic]]", "[[spooling-report-rows-through-kv]]", "[[all-14-reports-run-in-sqlite-rows-reach-the-renderer-by-kv-handle-never-quickjs]]", "[[report-routes-ignore-date-defaults]]"]
---

# guest-smoke report-total checks fail on a pristine checkout (pre-existing)

`node trailbase/tools/guest-smoke.mjs` reports **68/76**, not 76/76. Eight checks fail, and they are
NOT caused by the spooled-report work — verified by stashing every tracked change and re-running.

## Evidence

```powershell
git stash push -- trailbase/runtime/ahscripts/routes/_app/route.ts \
                  trailbase/tb-ah-run-js/src/{api.rs,lib.rs,render.rs} \
                  trailbase/tb-ah-run-js/src/api/sqlite.rs
# route.ts confirmed pristine (the /bench probes gone)
node trailbase/tools/guest-smoke.mjs     # => 68/76, the SAME eight failures
```

`compute/` was never touched by the spool work — the ported statements are new files under
`app/reports/sql/`, and the JS reference path is `compute/reports.js`, unmodified.

## The failures

| check | expects |
|---|---|
| profit total is 91.00 (margin arithmetic) | `91.00` |
| profit row uses final-margin 90.42 | `90.42` |
| page data preserves profit total | `{"profit":"0.00"}` |
| item sales total sale is 731.00 | `731.00` |
| item sales net total is 591.00 | `591.00` |
| payments payable amount is 800.00 | `800.00` |
| payments recivable amount is 150.00 | `150.00` |

Plus two that are **genuinely flaky** — they pass on some runs and fail on others, and the failing set
varies between consecutive runs on unchanged code:

- `page data revalidates an unchanged filtered result`
- `cached result is identical`

## What is probably true

The pattern — `page data` returning `profit: "0.00"` while the report itself renders — points at the
**cached derived result** rather than at the report arithmetic. The two flaky checks are also cache
checks (`ETag` / cached-result identity), which points the same way: the report cache is being written
or read with a key that does not match what the page asked for.

The likely culprit is the rendered-page cache key versus the filter set. `report-routes-ignore-date-defaults`
records that the report routes were ignoring date defaults, and this is the neighbouring failure: the
cached payload for one filter set is being served for another. That would produce exactly these
symptoms — correct values for some queries, zeros for others, and intermittent results depending on
which request populated the cache first.

## Why this was not caught

The suite passed 76/76 earlier on 2026-09-30 **with the same checkout**. Given the two flaky cache
checks, the earlier clean run was most likely luck of ordering rather than a pass — which means
`76/76` was never a reliable gate for these checks, and any claim resting on it should be re-measured
by running it several times.

## Next step

Not the spool. Reproduce with the cache in play: run the suite repeatedly, capture whether
`page data preserves profit total` fails in the same run as `cached result is identical`, and check
whether the zero-total payload is a cache hit for the wrong key. See
[[report-routes-ignore-date-defaults]] for the adjacent known issue.