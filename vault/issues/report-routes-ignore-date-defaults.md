---
title: The /reports/* routes ignore their declared date defaults, so they disagree with /p/*
type: issue
status: resolved
severity: medium
created: 2026-09-26
updated: 2026-10-01
resolved: 2026-10-01
tags: [runtime-js, reports, defaults, parity, page-host]
related_to: ["[[runtime-js-guest-platform]]", "[[trailbase-declarative-page-host]]", "[[one-manifest-is-the-page-definition]]", "[[report-page-definitions-duplicated-and-already-divergent]]"]
---

# The /reports/* routes ignore their declared date defaults, so they disagree with /p/*

## RESOLVED 2026-10-01

Closed by [[one-manifest-is-the-page-definition]]. There is now **one** page definition and **one**
filter parser, so the two hosts cannot disagree about the default window.

The cause was a duplication, not a parser bug: `REPORT_PAGES` in `app/lib/report-pages.js` had its own
`defaults` and its own `parseFilters` (which overwrote them from the query), while the manifest at
`app/pages/**/meta.json` had `filters[].default` and `filtersFor` (which honoured them). Both declared
the same default and applied it differently.

`REPORT_PAGES` and `parseFilters` are deleted. The manifest's `{"fn": "monthStart"}` default is
resolved per request, and `filtersFor` is the only parser. Measured on the production depot after the
change:

```text
/reports/payments      bare GET:  10 rows   (was 26,099 all-time)
/reports/itemsales     bare GET:   5 rows   (was 21,823 all-time)
/reports/dailysale     bare GET:   3 rows   (was  8,204 all-time)
/reports/profit        bare GET:   3 rows   (was 21,823 all-time)
```

The original diagnosis below is kept because it explains the shape of the bug and the two
documentation-naming mistakes recorded in it.

---

⚠️ **Naming note:** despite the original title, this is about the `/reports/*` routes **inside the
guest frontend** ([[runtime-js-guest-platform]]) — the hand-written report routes in
`trailbase/runtime/ahscripts/lib/report-pages.js` — versus the declarative page host at `/p/*`. It is *not*
about the legacy Next.js app in `frontend/`.

## Summary

`parseFilters` in `trailbase/runtime/ahscripts/lib/report-pages.js` starts from `pageDef.defaults` and then
**overwrites every field** from the query string. A bare `GET /reports/<report>` with no query
therefore wipes the declared `from` / `to` defaults to empty strings, and the route computes
**all-time** figures. The declarative page for the same report applies the manifest default, so
the two entry points disagree about their default view while both declare the same default.

Effectively, `{ from: monthStart(), to: today() }` in `REPORT_PAGES[key].defaults` is only a
*form* default, not a *query* default.

This is the guest port of the former Node frontend's hand-written report routes (`frontend-ssr`,
removed 2026-09-27); `parseFilters` was carried over unchanged, so the defect survived the port.

## Measured evidence

Measured 2026-09-26 against a populated TrailBase depot (60,254 rows, snapshot v12), same machine,
on the former Node frontend's `/reports/*` routes; the guest runs the same `parseFilters` over the
same depot, so the bare-GET behaviour below is unchanged.

Rendered filter inputs on a bare `GET` (no query string):

```text
/reports/dailysale           from= to= booker= area= section=
/reports/productsale         from= to= booker= area= section=
/reports/paymentsbycompany   from= to= applyDate=on company= ...
/reports/ledgers/general     from= to= openingRecievables=0 ...
```

Resulting row counts — bare `GET` on the route versus the page host, which applies the manifest
default:

| Report | `/reports/*` (bare GET) | `/p/*` page host | Declared default |
|---|---|---|---|
| `dailysale` | **8,606 rows** | 19 rows | `today…today` |
| `paymentsbycompany` | **32,562 rows** | 11,760 rows | `monthStart…today`, applyDate on |
| `ledgers/general` | **26,614 rows** | 10,404 rows | `monthStart…today` |

**With the same filters applied to both paths the results are identical**, so this is a defaults
divergence, not an arithmetic difference. That distinction matters: it means the report engine is
not in question, only which window each entry point defaults to.

The logic dates to the first SSR commit (`8dc815f`, 2026-09-25) and was ported to the guest
unchanged, so it is **not** a regression introduced by the later report-refresh / page-host
commits (`ea2bd12`).

## Why it matters

- A user who opens a report tile gets a different default window depending on which path the tile
  links to. For `dailysale` the route shows every invoice ever rather than today.
- The cost is not cosmetic: the bare-GET path builds and returns 8k–32k rows where the page host
  returns tens to thousands. It is the exact class of whole-view fetch the rewrite exists to remove
  ([[performance-and-caching]]).
- It is a "two sources of truth" problem that has to be settled as part of
  [[trailbase-declarative-page-host]]: once the hand-written route is retired the manifest default
  wins and the reports hub must link to `/p/...`.

## Options

1. **Fix `parseFilters`** to override a field only when the query actually carries it. Smallest
   change; the route then matches the page default, and both paths agree.
2. **Leave the route as-is** and retire it in favour of the page host, adopting the manifest
   default everywhere. Fewer moving parts, but it removes a URL space that the report tiles
   currently link to.
3. **Make the declaration explicit** by distinguishing a form default from a query default in
   `REPORT_PAGES`, so the current behaviour becomes intentional and documented. Only worth it if
   the divergence is actually wanted.

Option 1 is the low-risk fix; option 2 is the one that removes the duplication the
page-host decision was meant to remove.

## Status

Open and unfixed in the guest. Not a regression, and not blocking — but it undercuts the
performance case for the report routes and will confuse anyone comparing the two paths.

## Evidence

- `trailbase/runtime/ahscripts/lib/report-pages.js` — `REPORT_PAGES[*].defaults` (e.g. `payments: {
  defaults: { from: monthStart(), to: today() }, … }`) and `parseFilters`, which reads the query
  over the defaults.
- `trailbase/runtime/ahscripts/lib/pages.js` → `resolveDefault`, and
  `trailbase/runtime/ahscripts/routes/_app/route.ts` → `filtersFor` (`value || field.value`), which
  is the behaviour the route is missing.
- `trailbase/runtime/ahscripts/pages/reports/dailysale/meta.json` — `{ "fn": "today" }` on both `from` and
  `to`, the declared default the route ignores.
- The measurements above, originally recorded 2026-09-26 against a 60,254-row depot on the former
  Node frontend (removed 2026-09-27); the prior vault held them as
  `issues/legacy-report-routes-ignore-date-defaults.md` and they are recoverable from `8f0349c^`
  — see [[previous-vault-recovery]].
