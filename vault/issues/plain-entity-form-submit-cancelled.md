---
title: "Plain <aa-entity-form> submit buttons were cancelled on click"
type: issue
status: fixed
severity: high
created: 2026-10-10
updated: 2026-10-10
tags: [components, entity-form, guest, bug, forms]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[features-as-native-web-components]]", "[[full-app-ui-sweep-2026-10-10]]", "[[tb-0037-component-library]]"]
---

# Plain `<aa-entity-form>` submit buttons were cancelled on click

**Status:** fixed 2026-10-10 in `runtime/ahscripts/public/js/components/entity-form.js`.

## Symptom

On `/inventory`, clicking **CREATE ITEM** (or **SAVE ITEM**) did nothing: no request, no new item, the
form left as typed. Reported live as "Create item is not working".

## Cause

`<aa-entity-form>` runs `_gate` on the submit control's `click` to surface validation, and — for a form
without `hx-boost`/`hx-post` — it called `_setBusy(true)` there, which **disables the submit button**.
Chrome abandons a native form submission whose submitter is disabled during its own `click`, so the POST
never fired. `requestSubmit()` (which bypasses the button) worked, which is how the defect was isolated.

htmx forms were unaffected (their busy state comes from `htmx:beforeRequest`), which is why the
management create/edit/delete screens worked and only a plain form (the inventory form) was dead.

## Fix

`_gate` now takes a `markBusy` flag: the click path passes `false`; only the `submit` event passes
`true`, where the navigation is already committed and disabling the control cannot cancel it.

Verified in Chrome: the **CREATE ITEM** click now posts and the row appears.
