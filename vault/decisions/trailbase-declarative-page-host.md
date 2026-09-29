---
title: Make report pages declarative manifests, not code
type: decision
status: accepted
decided_on: 2026-09-25
created: 2026-09-26
tags: [guest, pages, page-host, declarative]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[performance-and-caching]]"]
---

# Make report pages declarative manifests, not code

## Context

The legacy frontend implements each report as a hand-written React page: it builds its own
PocketBase filter, fetches the view it needs, computes totals in the component, and renders a
`mantine-datatable`. Fourteen reports plus four ledgers means eighteen places where the same
decisions (which data, which filter fields, which columns, which totals, when to fetch) are made
again slightly differently.

Two things made this worth changing rather than porting:

1. POS-0026 established that filters should be APPLY-gated — the request fires when the user
   presses APPLY, not on every keystroke — which is a *pattern*, not a per-page choice.
2. The TrailBase rewrite had to move report arithmetic out of SQL anyway
   ([[trailbase-drop-sql-views]]), so each page's data flow was being rewritten regardless.

The first increment (commit `bd81f2f`/`ea2bd12`) went further: a report's rows, totals and the
reference tables its filters need should be assembled server-side and handed to the browser as a
finished result.

## Decision

A page is a **folder of declarative data** — `pages/<slug>/meta.json` plus a template — and a
single generic runtime serves it.

```jsonc
{
  "title": "Profit Report",
  "template": "page.html",                                  // optional, defaults to page.html
  "needs": { "views": ["transactionsReport", "refs"] },     // tables derived from these
  "compute": { "report": "profit" },                        // a trusted named operation
  "filters": [ { "name": "from", "type": "date", "default": { "fn": "monthStart" } } ],
  "columns": [ { "key": "profitText", "label": "Profit", "right": true } ],
  "totals": [{ "label": "Total Profit", "key": "profit" }]
}
```

- The guest's generic page host (`trailbase/runtime/ahscripts/routes/_app/route.ts`) **knows nothing
  about any specific page.** It discovers folders, renders the declared template, serves the
  declared tables, and dispatches the declared compute operation. Adding a page is adding a folder.
- `trailbase/runtime/app/lib/pages.js` is the registry: it normalises the manifest, resolves a filter
  default through `compute/format.js` when it is `{ "fn": "…" }`, and derives `needs.tables` from
  `needs.views` (plus each `select` filter's `source`) so a page *cannot* under-declare the data
  it needs.
- `/p/<slug>/data` returns `{version, slug, filters, result, meta}` plus only the tables needed
  for the select filters. **The browser renders a finished result and does no report
  computation.**
- All 14 existing reports and 4 ledgers were converted, and `/reports/*` was kept as the
  user-visible URL space for them.

## Why

- **One place decides the data contract.** Filter types, defaults, column definitions and totals
  are data, so they can be diffed, reviewed and reused instead of being re-implemented.
- **A page cannot fetch the wrong thing.** `needs.tables` is derived, not declared, so the class
  of bug where a page reads a view it forgot to list cannot happen.
- **The compute surface is closed.** A manifest names a *trusted operation* (`compute.report`),
  not arbitrary code, so a page cannot introduce new client-side logic — which is what makes it
  safe to serve results rather than raw views.
- **Filters stay APPLY-gated for free**, because the form and the request are both generated from
  the same `filters` array.
- **The same compute code runs in both runtimes.** `compute/` is served at `/compute/*` (behind
  auth) as the identical bytes the guest imports, so the browser and the guest cannot drift.

## Consequences

**Accepted**

- 14 page folders, each two files, replacing 14 bespoke pages. `/p` lists them; `/p/<slug>` and
  `/p/<slug>/data` serve them.
- The `meta.json` shape is a contract: the data payload's ETag carries a `v3` revision
  (`W/"v3-…"` in the route), bumped when the payload shape changes so client caches invalidate.
- `metaJson` is serialised in the guest host rather than in the template, because MiniJinja hands
  templates a proxy and `| json` on it yields `{}`; `<` is escaped so it cannot close the script
  tag.
- `readPage` rejects anything escaping `pagesDir` (`..`, `\`, NUL).

**Given up**

- The legacy `/reports/*` routes still exist and duplicate the new ones. They are not equivalent:
  the legacy screen computes client-side from a view. Retiring them is
  [[tb-0013-rework-report-screens-without-views]] / the old `tb-0009` task; the old vault also
  recorded a follow-up that the declarative path was *slower* than server rendering
  (`issues/declarative-pages-slower-than-server-rendering.md`), which is worth re-measuring
  before trusting the new path at volume — see [[previous-vault-recovery]].
- A page that genuinely needs imperative behaviour does not fit the manifest and would need a
  real route again. None does today.
- The template still has to exist, so "one folder" is really "two files plus a manifest".

## Evidence

- `trailbase/runtime/app/lib/pages.js` — the registry, `normalizeMeta`, `resolveDefault`,
  `MAX_DEPTH = 6`, and the slug-escape rejection in `readPage`.
- `trailbase/runtime/ahscripts/routes/_app/route.ts` — the generic host, `filtersFor`, the
  `W/"v3-…"` ETag and gzip handling, and the `/p/<slug>` and `/p/<slug>/data` endpoints.
- `trailbase/runtime/app/pages/` — 14 folders, each `meta.json` + `page.html` (`reports/{payments,
  salesreport,paymentsbycompany,itemsales,profit,stock,difference,outstanding,productsale,
  dailysale}`, `ledgers/{area,booker,general,party}`).
- `trailbase/runtime/app/pages/reports/profit/meta.json` — the worked example quoted above.
- The prior vault's `decisions/trailbase-declarative-page-host.md` (`ea2bd12`) is the original
  record; see [[previous-vault-recovery]].
