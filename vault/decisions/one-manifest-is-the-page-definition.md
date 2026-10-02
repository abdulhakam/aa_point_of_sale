---
title: One manifest is the page definition; the JS copy is gone
type: decision
status: active
created: 2026-10-01
updated: 2026-10-01
tags: [runtime-js, reports, manifest, architecture, code-deletion]
related_to: ["[[runtime-js-minimal-file-authoring-contract]]", "[[report-logic-stays-runtime-file-based]]", "[[report-page-definitions-duplicated-and-already-divergent]]", "[[report-routes-ignore-date-defaults]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[payment-type-select-never-comes-back-selected]]", "[[tb-0032-manifest-first-refactor]]", "[[rendered-page-cache]]", "[[legacy-parity-checks-waived]]"]
---

# One manifest is the page definition; the JS copy is gone

## The decision

A report is defined **once**, in `app/pages/<group>/<name>/meta.json`, and that one file serves both
hosts:

- `/reports/<key>` — server-rendered HTML (filters, rows, totals, print layout, row cap)
- `/p/<slug>` — a JSON payload the browser fetches and renders

`REPORT_PAGES`, `REPORT_INDEX` and `LEDGER_INDEX` in `app/lib/report-pages.js` are **deleted**. That
module is 72 lines now, down from 378, and holds only the two things a manifest cannot carry:
`filterOptions` (select options, from the live refs snapshot) and `openingRow` (the general ledger's
three opening balances, which are an echo of filter inputs rather than a query result).

The reports and ledgers index tiles are **derived** from each manifest's `hub` block, so there is no
second list of titles, tones, icons or ordering.

## Why

Two definitions of the same report had already drifted, and the money was wrong in both directions of
the comparison — see [[report-page-definitions-duplicated-and-already-divergent]]. The duplication was
not theoretical: it produced a `Payable Amount` on `/reports/payments` that was not the sum of the
three rows printed above it, and a `/p` company filter offering **zero** options.

The format was extended rather than the JS generalised, because the manifest is the cheaper authoring
surface: it is not JavaScript, so it needs no engine to edit, and the crawler can still list every
route by reading inert files.

## What the manifest format gained

The old JS could express things JSON cannot, so the format absorbed them:

| field | why it exists |
|---|---|
| `view` | a template override — the general ledger's layout |
| `openings` | the three opening-balance inputs |
| `totals` / `totalsGroups` | flat totals, or **grouped** totals tables (payments, salesreport) |
| `totals[].join` | a composed value, for the outstanding ledger's `invoice / paid / balance` |
| `hub` | the index tile: title, tone, icon, order, and which hub lists it |
| `filters[].default` | `{"fn": "monthStart"}` — a **date window**, resolved per request |

The `join` form is the one genuinely composed value, and it is the reason a manifest stays inert: the
JS spelled it as a template literal, the manifest spells it as an array of keys and literal text.

## Two consequences worth keeping

**The date-defaults defect closed.** [[report-routes-ignore-date-defaults]] was caused by two page
definitions parsing filters differently: `parseFilters` read the query over the defaults, so a bare GET
computed all-time figures, while `filtersFor` honoured them. With one definition there is one parser
and the defect cannot recur. Measured after the change, on the production depot:

```text
/reports/payments      bare GET:  10 rows   (was 26,099 all-time)
/reports/itemsales     bare GET:   5 rows   (was 21,823 all-time)
/reports/dailysale     bare GET:   3 rows   (was  8,204 all-time)
```

**`/reports` and `/p` can no longer disagree**, because there is only one file for them to disagree
about.

## P2, 2026-10-01: `/p` is server-rendered too

The manifest is the one definition, and now it is also the only **rendering** path.
`renderReportPage` was lifted out of the `/reports` route and both routes call it, so `/p/<slug>` and
`/reports/<key>` are the same page: rows arrive as a KV handle, are spliced into the template in Rust,
and the browser gets finished HTML.

`public/js/runtime/page.js` is **deleted** — 171 lines. `page_body.html` no longer embeds the manifest
as JSON for a driver. A page with no report behind it still renders (filters, empty table, totals)
and works with no JavaScript at all, which is the point of a declarative page.

Measured, `/p/reports/payments?from=2020-01-01&to=2030-12-31`:

| | before | after |
|---|---|---|
| response | 8,242 KB JSON | **465 KB HTML** |
| time to content | 1,763 ms (fetch + client render) | **52 ms** |

The `/p/<slug>/data` JSON endpoint stays, uncapped, as an API for a programmatic consumer. The
browser does not use it.

**Client JavaScript is now 378 lines in one file** (`app.js`) — a clock, the refresh dot, print, confirm
on delete, select filtering, table search, and the live invoice grid. The grid's money formulas are a
deliberate duplicate of the server's, per `decisions/client-side-live-recalculation.md`; that is a
decided trade, not boilerplate.

### The bug the extraction introduced, and how it was found

Splicing the report block out by **line number** corrupted the `/bench/spool` route — a
mis-counted offset put the report wrapper inside a template literal, so the whole dispatcher failed
its top-level evaluation and every route returned 404, with no error in the log.

Two things learned:
- **Verify the parse before syncing.** `node --experimental-strip-types` on a copy of the file finds
  the exact error in one second; the running server reports only "404". A hand-rolled regex
  type-stripper is worse than useless here — it mangles ternaries and reports a phantom.
- **Anchor edits on content, not line numbers.** Re-doing the extraction against verified assertion
  points (assert the boundary lines are what they are expected to be) was the fix.

`tools/gen-manifests.mjs` generated all 14 manifests from the JS definitions rather than by hand, so
nothing was transcribed. It is a **one-shot** tool: the module it read no longer exists, and the
recovered pre-migration source is staged at `tools/_src/` with the header explaining how to re-stage
it from git.

Two things it corrects, both established by measurement before the migration:
- `payments` "Payable Amount" → `totalSending`
- `itemsales` / `stock` company source → `companies` (not the empty `categories` table)

## The trap worth remembering

The first attempt recovered each date default **by value** — evaluate `today()` and `monthStart()`, see
which one matches. On 2026-10-01 those two return the same string, so every `to` default was labelled
`monthStart` and every report's window silently widened to the whole month. Reordering the candidates
then inverted it, so `from` became `today` and the reports showed a single day.

The fix was to stop matching values and read the **function name out of the source text** of the
`defaults` object. A migration that recovers meaning from a computed value will get it wrong exactly
when the value is ambiguous, and the error is silent.

## Status

Done and verified. `tools/verify-pages.ps1` drives the running app over HTTP and asserts all of it —
32 checks, all passing. `verify-spool-reports.mjs` is 14/14 with exit 0. `guest-smoke.mjs` is 67/76,
the same nine pre-existing failures as before the change.

## Not done, and why

> **This section was written 2026-10-01 and its first bullet is now history.** `compute/reports.js`
> was deleted the same day (see *SQL-only* below), and the parity reason for keeping it was waived on
> 2026-10-02 ([[legacy-parity-checks-waived]]). What is still outstanding is `compute/views.js` and
> `app/lib/reports.js`, now tracked as [[tb-0032-manifest-first-refactor]].

- ~~**`compute/reports.js` still exists**~~ — **deleted 2026-10-01** with the JavaScript report engine,
  along with the `useJs` manifest flag and the JS-vs-SQL halves of `verify-spool-reports.mjs`. The
  golden-output corpus that was to replace it was never needed, because parity was waived rather than
  preserved: [[legacy-parity-checks-waived]].
- **`compute/views.js` (621 lines) and `app/lib/reports.js` (371) remain.** They are now needed only
  for `counts` and `refs`; every report reads `prelude.sql` instead. Retiring them is
  [[tb-0032-manifest-first-refactor]], and the blocking item is that **`refs` has no `.sql` equivalent
  yet**.
- ~~**The rendered-page cache does not key on code.**~~ **Fixed 2026-10-02.** The key now carries
  `paths.runtimeRevision()`, a content hash of the whole runtime tree, so a code change invalidates
  the cache and not only a data change — see [[rendered-page-cache]]. The trap is closed *before*
  [[tb-0032-manifest-first-refactor]] starts, rather than five phases into it.
- **`traildepot/runtime/` is a generated copy** (`robocopy runtime traildepot\runtime /MIR`) and is
  git-ignored. Editing `trailbase/runtime` does nothing until it is synced, and the sync is not part
  of `build.bat`. Editing the wrong copy is silent.

## Related

- [[runtime-js-minimal-file-authoring-contract]] — the direction this implements.
- [[report-logic-stays-runtime-file-based]] — why the SQL stays a file and not a database view.
- [[browser-page-and-filter-sweep-2026-10-01]] — the page/filter sweep that found the duplication.
- [[report-total-disagrees-with-its-own-printed-column]] — the other money bug this phase did not fix.


## SQL-only: the JavaScript engine is gone (2026-10-01)

The user set the direction: **every calculation is performed through SQL**, and the comparison against
the legacy production system happens once the migration is complete rather than continuously. That
retires the reason `compute/reports.js` had been kept.

Deleted, with the escape hatch that reached it:

- `app/compute/reports.js` — 577 lines, the JavaScript report engine
- the `useJs` manifest flag and the branch in the report page that ran it
- `/bench/runreport`, which timed the JS path
- `lib/reports.js`'s `run()`, `viewsForReport()` and the report cache key
- `tools/verify-spool-report.mjs` and `tools/bench-reports-baseline.mjs` (pure comparisons)
- the JS-vs-SQL halves of `tools/verify-spool-reports.mjs`, which is now a self-consistency gate
- `cachedReports` / `reportCacheHits` / `reportCacheMisses` from `/reports/status`

`app/compute/` is now `format.js`, `ids.js` and `views.js` — 728 lines, none of it report
arithmetic. `/bench/reportkeys` reads the spool registry, which is the list of reports.

### Two things that would have failed quietly

**`viewsForReport` had nowhere to read from.** It returned `REPORTS[name].inputs`, the input list the
JS engine carried. The manifest declares the same thing as `needs.views`, so `/bench/report` now reads
that. A registry read from a deleted file would have been a 500 on one bench route.

**A counter that could only ever read 0.** `reportCacheHits` counted the JS path's KV result cache.
With the engine gone it could never move, and the smoke check on it failed forever while measuring
nothing. It is removed rather than left, and replaced with a check on the caches that exist. The
lesson is the general one: **a metric whose subject no longer exists should be deleted, not left
failing** — it reads as a defect and trains people to ignore the gate.

### The provenance comments stay

`spoolreports.js` carries ~19 comments citing `compute/reports.js:NN`. They record WHY a statement
buckets on a raw field, or rounds a sub-total before subtracting, or excludes a party type — the kind
of thing otherwise re-litigated on every read. They are kept, with the file's header saying the
reference is to history and pointing at the commit that still holds it
(`git show 04cd42b:trailbase/runtime/app/compute/reports.js`).

## The runtime is the source; the depot is generated (2026-10-01)

`trailbase/runtime/` is the **source** of the app: manifests, SQL, templates, route folders, client
JavaScript. `trailbase/traildepot/runtime/` is the copy the server actually loads, and it is
git-ignored.

The copy used to happen only in `clear_db.bat`, which runs when the depot **does not exist yet** — so
on every normal start the depot served the app as it was when the depot was created. An edit to
`runtime/` was silently not served. That cost an hour during the P1 migration and would cost the
next person the same.

`RUN.BAT` now syncs unconditionally, before the server starts, with `/MIR` so a deleted or renamed
file disappears from the copy too. Robocopy's 0-7 are success and 8+ are failures, so the check is
`if errorlevel 8`.
