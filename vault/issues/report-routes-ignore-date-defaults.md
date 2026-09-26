---
title: The /reports/* routes ignore their declared date defaults, so they disagree with /p/*
type: issue
status: open
severity: medium
created: 2026-09-26
tags: [frontend-ssr, reports, defaults, parity, page-host]
related_to: ["[[frontend-ssr]]", "[[trailbase-declarative-page-host]]"]
---

# The /reports/* routes ignore their declared date defaults, so they disagree with /p/*

⚠️ **Naming note:** despite the original title, this is about the `/reports/*` routes **inside
[[frontend-ssr]]** — the hand-written report routes — versus the declarative page host at `/p/*`.
It is *not* about the legacy Next.js app in `frontend/`.

## Summary

`parseFilters` in `frontend-ssr/src/routes/reports.js` starts from `pageDef.defaults` and then
**overwrites every field** from the query string. A bare `GET /reports/<report>` with no query
therefore wipes the declared `from` / `to` defaults to empty strings, and the route computes
**all-time** figures. The declarative page for the same report applies the manifest default, so
the two entry points disagree about their default view while both declare the same default.

Effectively, `{ from: monthStart(), to: today() }` in `REPORT_PAGES[key].defaults` is only a
*form* default, not a *query* default.

## Measured evidence

Measured 2026-09-26 against a populated TrailBase depot (60,254 rows, snapshot v12), same machine.

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

`git blame` dates the logic to the first SSR commit (`8dc815f`, 2026-09-25), so it is **not** a
regression introduced by the later report-refresh / page-host commits (`ea2bd12`).

## Why it matters

- A user who opens a report tile gets a different default window depending on which path the tile
  links to. For `dailysale` the route shows every invoice ever rather than today.
- The cost is not cosmetic: the bare-GET path builds and returns 8k–32k rows where the page host
  returns tens to thousands. It is the exact class of whole-view fetch the rewrite exists to remove
  ([[performance-and-caching]]).
- It is a "two sources of truth" problem that has to be settled as part of
  [[trailbase-declarative-page-host]]: once the legacy route is retired the manifest default wins
  and the reports hub must link to `/p/...`.

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

Open and unfixed. Not a regression, and not blocking — but it undercuts the performance case for
the report routes and will confuse anyone comparing the two paths.

## Evidence

- `frontend-ssr/src/routes/reports.js` — `REPORT_PAGES[*].defaults` (e.g. `payments: { defaults: {
  from: monthStart(), to: today() }, … }`) and `parseFilters`, which reads the query over the
  defaults.
- `frontend-ssr/src/lib/pages.js` → `resolveDefault`, and `frontend-ssr/src/routes/pages.js` →
  `filtersFor` (`value || field.value`), which is the behaviour the route is missing.
- `frontend-ssr/pages/reports/dailysale/meta.json` — `{ "fn": "today" }` on both `from` and `to`,
  the declared default the route ignores.
- The measurements above, originally recorded 2026-09-26 against a 60,254-row depot; the prior
  vault held them as `issues/legacy-report-routes-ignore-date-defaults.md` and they are
  recoverable from `8f0349c^` — see [[previous-vault-recovery]].
