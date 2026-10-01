---
title: One manifest is the page definition; the JS copy is gone
type: decision
status: active
created: 2026-10-01
updated: 2026-10-01
tags: [runtime-js, reports, manifest, architecture, code-deletion]
related_to: ["[[runtime-js-minimal-file-authoring-contract]]", "[[report-logic-stays-runtime-file-based]]", "[[report-page-definitions-duplicated-and-already-divergent]]", "[[report-routes-ignore-date-defaults]]", "[[compiled-artifacts-are-generic-capabilities]]", "[[payment-type-select-never-comes-back-selected]]"]
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

## How the migration was done

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

- **`compute/reports.js` still exists** (577 lines). It is the parity oracle the gates import, and
  `verify-spool-reports.mjs` still reports a 1-paisa `productsale.amount` difference against it. It
  is deliberately NOT deleted until a golden-output corpus replaces it — see
  [[guest-parity-differential-not-reproducible]].
- **The rendered-page cache does not key on code.** A code or manifest change does not invalidate
  `pagecache`, so a stale page is served until the fingerprint moves or the table is cleared. That
  cost an hour of false negatives during this migration and is a live trap for the next one.
- **`traildepot/runtime/` is a generated copy** (`robocopy runtime traildepot\runtime /MIR`) and is
  git-ignored. Editing `trailbase/runtime` does nothing until it is synced, and the sync is not part
  of `build.bat`. Editing the wrong copy is silent.

## Related

- [[runtime-js-minimal-file-authoring-contract]] — the direction this implements.
- [[report-logic-stays-runtime-file-based]] — why the SQL stays a file and not a database view.
- [[browser-page-and-filter-sweep-2026-10-01]] — the page/filter sweep that found the duplication.
- [[report-total-disagrees-with-its-own-printed-column]] — the other money bug this phase did not fix.
