---
title: "Management relation/enum selects showed a duplicate blank option"
type: issue
status: fixed
severity: low
created: 2026-10-10
updated: 2026-10-10
tags: [management, components, guest, bug, forms]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[full-app-ui-sweep-2026-10-10]]", "[[tb-0037-component-library]]"]
---

# Management relation/enum selects showed a duplicate blank option

**Status:** fixed 2026-10-10 in `runtime/ahscripts/views/partials/entity_fields.html.jinja`.

## Symptom

On `/management/items?new=1` and `/management/parties?new=1`, the Company / Type / Area selects listed a
blank `—` option **twice** (e.g. two `—` at the top of the Company list).

## Cause

`management.formFields` already prepends `{ value: "", label: "—" }` to a select's options (and marks it
`selected` when the value is empty), and `entity_fields.html.jinja` added a second `<option value="">—</option>`
of its own. Two blanks for every non-multiple select.

## Fix

Removed the template's blank; the descriptor's blank (the one that carries `selected`) is the single
source. Verified in Chrome: the Company select now has one `—` plus the companies.
