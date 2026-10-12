---
title: Code-review fixes, 2026-10-08 (restyle + refdb)
type: note
status: active
created: 2026-10-08
updated: 2026-10-08
tags: [guest, frontend, refdb, review, fixes, deploy-safety]
related_to: ["[[reference-lists-come-from-indexeddb]]", "[[features-as-native-web-components]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[fingerprint-memo-is-per-thread-so-a-read-after-a-write-can-be-stale]]", "[[tb-0023-guest-feature-parity]]"]
---

# Code-review fixes, 2026-10-08 (restyle + refdb)

A `/review` pass over the restyle + refdb session found one requirement conflict, two versioning
gaps, three duplications and several dead-code leftovers. All were fixed in the same session; the
gates were re-run green.

## Requirement conflict (report screens)

`report.html.jinja` had wrapped the **"Find in this report"** row in `{% if not def.filtersModal %}` and the
modal reports' inline **APPLY** became the dialog's OK. The requirement is to KEEP both guest features,
so the guard is gone: the row is on every report again, alongside the stock/difference filter dialog.
The apply action on a modal report is the dialog's submit.

## Versioning (the reference cache)

- **`dataVersionIfWarm` now reads the shared stamp.** It returned a per-thread memo, so a page served
  by a thread with a warm pre-write memo embedded a pre-write version and the client trusted its
  equally stale IndexedDB cache — the bug the shared stamp exists to close
  ([[fingerprint-memo-is-per-thread-so-a-read-after-a-write-can-be-stale]]). It is now `async` and
  returns `""` when the stamp moved, so the client syncs. `route-kit.js` awaits it.
- **A cache revision (`CACHE_REV`) is stored with the version** and compared on load, so a deploy that
  changes the refs projection or the option spec invalidates every warm client even when the data
  fingerprint is unchanged. Bump `CACHE_REV` on such a change.

## Duplication

- `/data/refs` now sends the **alias map and the per-table option spec**, and `refdb.js`
  adopts them (persisting them in the meta record for the cache path) instead of keeping its own
  `REF_ALIAS`/`TABLE_SPEC` copies — one source, so it cannot drift from the projection it consumes.
- `quick-create/route.ts` builds the client-cache row through the new `quickCreate.refRow`, beside the
  writers, instead of re-deriving the invoice→party translation and item columns.

## Performance

- `refdb.js` skips the full `applyAll()` rebuild when the fetched version equals the page's own
  version (the server already rendered identical options), avoiding thousands of `<option>` nodes and
  a re-normalisation pass on the app's busiest screens.

## Dead code

Removed what the template rewrites orphaned: the cash-memo route's three aggregate sums + `totals`/
`filters`, the dashboard route's `counts()`/`tiles`, `.c-blue-4` (and `--blue-4`), `.btn.subtle`, and
the `receipt` icon branch.

## Regression found while fixing

The earlier blank-option change (the autocomplete shows the blank option's own label, legacy's `All` /
`No party`) made the resting box read as a query: the open list filtered on "no party" and offered a
bogus `Create "No party"` row instead of a refdb-inserted row. `autocomplete.js` now treats the
displayed current-selection label as an **empty query** (`typedQuery()`), used by `filter`,
`creatableName` and `commitTyped`. Caught by `refdb-check` case 4.

Gates after the fixes: `guest-smoke` 115/115, `route-snapshot` 49/0, `refdb-check` 12/12,
`autocomplete-check` 39/0, `hotkey-check` 62/0, `grid-preview-check` 14/0.
