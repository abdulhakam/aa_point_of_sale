---
title: The Payment Type select never comes back selected, so an applied type filter looks unapplied
type: issue
status: open
severity: medium
created: 2026-10-01
updated: 2026-10-01
tags: [runtime-js, reports, filters, minijinja, ui]
related_to: ["[[runtime-js-guest-platform]]", "[[report-routes-ignore-date-defaults]]", "[[spooling-report-rows-through-kv]]"]
---

# The Payment Type select never comes back `selected`, so an applied type filter looks unapplied

## The defect

On `/reports/payments`, choosing **Payment Type** and pressing APPLY *does* filter the rows, but the
`<select name="type">` re-renders with every option unselected. A second visit to the page, or any
edit of another filter, shows "All" while the report is still filtered by type — so the operator
cannot see what is applied from the form.

Measured 2026-10-01 on `127.0.0.1:4000` against the loaded production depot (8,204 sale invoices,
943 parties):

```text
/reports/payments                      -> <select name="type"> contains " selected" : false, 1009 <tr>
/reports/payments?type=2               -> <select name="type"> contains " selected" : false,   56 <tr>
/reports/payments?party=<valid id>     -> <option value="AaDr_TV6dzOx7ykS49LJJA==" selected>  : TRUE   (control)
```

So the filter works, the rendering of the selected option does not.

## Root cause

`parseFilters` coerces the one numeric filter to a **Number**:

```js
// trailbase/runtime/app/lib/report-pages.js:337
if (filters.type !== undefined && filters.type !== "") filters.type = Number(filters.type);
```

The template compares it against the **string** option values that `filterOptions` built:

```jinja
{# trailbase/runtime/app/views/partials/filters.html:9 #}
<option value="{{ o.value }}"{% if filters[field.name] == o.value %} selected{% endif %}>
```

`Number(2) == "2"` is false in minijinja (no string/number coercion), so no option matches and none
is marked selected. Every other filter (`party`, `area`, `section`, `booker`, `company`, `item`)
stays a string end to end and round-trips correctly — which is exactly the control that isolates
the cause.

The `report-meta` line still shows the applied value (`Payment Type: return`), because
`appliedLabels` re-derives the label by looking the raw value up in `options` before the number
coercion bites. So the applied filter is discoverable, just not in the form control itself.

## Why it matters

`type` is the only numeric filter, so this is the only select affected — but it is the one on the
first report tile, and "the dropdown says All while the numbers are filtered" is the kind of thing
that gets reported as "the filter is broken".

## Options

1. **Stop coercing in `parseFilters`** and let the SQL `CAST(:type AS INTEGER)` do the work. The
   statement already casts (`AND (:type = '' OR pv.type = CAST(:type AS INTEGER))` in
   `reports/sql/reports/payments.sql:47`), so the coercion is redundant on the query side and is
   the only thing that breaks the template.
2. **Cast in the template** (`filters[field.name] | string == o.value`). Fixes the symptom, leaves
   the number/string split in place.

Option 1 is the smaller change and removes the type asymmetry rather than papering over it.

## Status

Open, unfixed, not a regression. The filter arithmetic itself is correct — only the selected-state
rendering is wrong.

## Evidence

- `trailbase/runtime/app/lib/report-pages.js:337` — `filters.type = Number(...)`.
- `trailbase/runtime/app/views/partials/filters.html:9` — `filters[field.name] == o.value`.
- `trailbase/runtime/app/reports/sql/reports/payments.sql:47` — the bind is already CAST in SQL.
- The fetch sweep above, run against `http://127.0.0.1:4000` on 2026-10-01.