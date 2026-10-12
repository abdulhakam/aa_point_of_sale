---
title: "Components consume server descriptors; light DOM over the global stylesheet"
type: decision
status: accepted
decided_on: 2026-10-09
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, frontend, web-components, dx, entities, forms]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[features-as-native-web-components]]", "[[trailbase-declarative-page-host]]", "[[one-manifest-is-the-page-definition]]", "[[minimise-client-side-calculation]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[htmx-navigation-with-html-fragments]]", "[[tb-0037-component-library]]"]
---

# Components consume server descriptors; light DOM over the global stylesheet

## Context

The owner proposed a set of reusable UI components — a schema-driven CRUD dialog (validation,
disabled/hidden fields with conditions such as an id hidden on create and disabled on edit), an
invoice component that adapts by invoice type, and a live clock — written as native web components in
separate files sharing one global stylesheet.

Two facts from the codebase reshape the proposal:

- **The entity schema already exists server-side.** `app/manifests/entities.json` (one declaration,
  read by `app/lib/entities.js`) holds each entity's `fields` (type, label, required, source),
  `columns`, `sort` and `softDelete`. `app/lib/management.js` `formFields()` renders it and
  `management/{id}/delete/route.ts` already does a **soft delete** (`SET deleted = 1`) when the flag
  is set. So "one schema; delete sets `deleted=true`" is not new — it is the current design.
- **There is no per-invoice-type table.** `invoices` is one table with a `type` code (0 purchase,
  1 sale, 2 return, 3 difference) and `partyTypeForInvoice` maps the code to a party kind. Different
  shapes are already server-side per route.

## Decision

**Components are light-DOM custom elements, styled by the single global stylesheet, that CONSUME
server-provided descriptors — they never own a schema or a type/table mapping.**

1. **No shadow DOM.** `aa-modal`, `aa-date-input` and `aa-live-time` build plain elements in the light
   DOM and are styled by `public/css/app.css`. Shadow roots would wall components off from the one
   stylesheet the look (and `[[parity-reinstates-the-legacy-look-with-defect-fixes]]`) depends on.
2. **Progressive enhancement.** The server keeps rendering the real markup; a component enhances it and
   a page with no JavaScript is unchanged (the `aa-modal`/`refdb-create` contract). The
   scripting-off gates (`grid-preview-check`, `ui-capture`) depend on this.
3. **Consume, do not own.** A form component renders from the server's field descriptors
   (`entities.json` → `formFields()`); it does not carry its own per-entity schema. An invoice
   component takes a server-provided descriptor for the `type`; it does not switch databases or
   duplicate persistence. **Validation stays server-authoritative** (`missingRequired`,
   `[[guest-writes-via-sql]]`); the client mirrors `required` for UX only. This is the same rule as
   [[trailbase-declarative-page-host]] and [[one-manifest-is-the-page-definition]], and the same drift
   the reconcile corrections warn about.
4. **The entity field model gains optional `hidden`/`disabled`.** Each is `true`/`false`, a mode
   (`"create"`/`"edit"`/`"view"`) or an array of modes; `formFields(entity, row, options, links, mode)`
   resolves them. `view` is read-only — every field disabled, no submit — which also gives the
   management list's eye icon a distinct read-only screen from the pencil's edit form.

## Evidence (2026-10-09)

- `entities.json` + `app/lib/management.js:formFields` — the field model, extended with
  `hidden`/`disabled`; `view` disables every field.
- `management/{entity}/route.ts` — `?view=<id>` sets `mode = "view"`; `management/list.html.jinja` renders a
  read-only panel with a "Back to list" action and the eye icon links to `?view=`.
- Verified over HTTP: `?view=` → "View Section", field `disabled`, no Save, Back link; `?edit=` →
  editable with Save; `?new=1` → create. `guest-smoke` 116/116, `route-snapshot` 50/0.
- `<aa-live-time>` (`components/live-time.js`) replaced the `app.js` clock, which painted H:M:S on a
  **30 s** interval (seconds that froze); it now ticks every second and pauses while the tab is hidden.
- `<aa-modal>` gained `disconnectedCallback` overlay cleanup (see
  [[htmx-navigation-with-html-fragments]]) — the first proof that a component which appends to
  `<body>` must clean up to survive an htmx swap.

## Consequences

- New components follow: light DOM, global CSS class names, a server descriptor as input, a no-JS
  fallback. A component that needs new data asks the server for it; it does not invent the shape.
- The entity schema is the one place a field's visibility/availability is declared.
- The invoice entry UI was unified in `<aa-invoice-entry>` on 2026-10-09, taking the server `type`
  descriptor — never a client type→table switch ([[component-library-2026-10-09]]). It is the container
  of `views/invoices/entry.html.jinja` and owns only the client behaviour (the item→price fill); the server
  still renders the type's fields.

## Related

- [[tb-0037-component-library]] — the component roadmap.
- [[features-as-native-web-components]] — the component contract this refines.
- [[htmx-navigation-with-html-fragments]] — where the light-DOM/fragment model is proven.
