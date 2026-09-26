---
type: Issue
status: Open
created: 2026-09-26T00:00:00.000Z
updated: 2026-09-26T00:00:00.000Z
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[TB-0008 Serve report results from the page host instead of whole views]]"
  - "[[TB-0009 Retire the legacy report routes in favour of the page host]]"
affects:
  - "[[Frontend — TrailBase Server-Rendered App]]"
tags:
  - trailbase
  - frontend
  - reports
  - defaults
  - parity
---

# Issue — Legacy report routes ignore their declared date defaults

## Summary

`parseFilters` in `src/routes/reports.js` starts from `pageDef.defaults` and then **overwrites every
field** from the query string, so a bare `GET /reports/<report>` (no query) wipes the declared
`from`/`to` defaults to empty strings. The legacy route therefore computes **all-time** figures, while
the declarative page for the same report applies the manifest default date range. The two entry points
disagree on their default view even though both declare the same default.

## Evidence

Measured 2026-09-26 on the live dataset (TrailBase, 60,254 rows, snapshot v12), same machine.

Rendered filter inputs on a bare `GET` (no query):

```
/reports/dailysale         from= to= booker= area= section=
/reports/productsale       from= to= booker= area= section=
/reports/paymentsbycompany from= to= applyDate=on company= ...
/reports/ledgers/general   from= to= openingRecievables=0 ...
```

Resulting row counts (bare GET vs the page host, which applies the manifest default):

| report | legacy (bare GET) | page host | declared default |
|---|---|---|---|
| `dailysale` | 8,606 rows | 19 rows | `today…today` |
| `paymentsbycompany` | 32,562 rows | 11,760 rows | `monthStart…today`, applyDate on |
| `ledgers/general` | 26,614 rows | 10,404 rows | `monthStart…today` |

With the same filters applied to both paths, the results are **identical** — so this is a defaults
divergence, not an arithmetic difference. See the parity result in
[[TB-0008 Serve report results from the page host instead of whole views]].

`git blame` dates the logic to the first SSR commit (`8dc815f`, 2026-09-25 00:50), so it is **not** a
regression from the report-refresh / page-host commits.

## Impact

- A user opening a report tile sees a different default window depending on which path the tile links
  to (`/reports/*` today). For `dailysale` the legacy route shows every invoice ever rather than today.
- It is one of the "two sources of truth" differences that
  [[TB-0009 Retire the legacy report routes in favour of the page host]] must settle: when the legacy
  routes are retired, the page-host default wins and the reports hub must link to `/p/...`.

## Options

1. Fix `parseFilters` to only override a field when the query actually carries it (legacy route then
   matches the page default).
2. Leave the legacy route as-is and let
   [[TB-0009 Retire the legacy report routes in favour of the page host]] remove it; adopt the manifest
   default everywhere.

## Related

- [[TB-0008 Serve report results from the page host instead of whole views]] — the parity work that
  surfaced this.
- [[TB-0009 Retire the legacy report routes in favour of the page host]]
- [[Decision — Declarative pages: a folder is a page, the server is a generic host]]
