---
title: Interactive features are reusable native web components
type: decision
status: accepted
decided_on: 2026-10-08
created: 2026-10-08
updated: 2026-10-08
tags: [guest, ui, frontend, javascript, components, parity]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0023-guest-feature-parity]]", "[[reference-lists-come-from-indexeddb]]", "[[minimise-client-side-calculation]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[ui-parity-discrepancies-2026-10-05]]"]
---

# Interactive features are reusable native web components

## Decision

A feature the guest has to add that is **interactive and repeats across several screens** is built as
a **native custom element** — `<aa-…>` — authored under `app/public/js/components/`, registered with
`customElements.define`, and loaded from `layout.html.jinja` with `defer`. The element **enhances markup
that already works**: with no JavaScript the browser shows the ordinary form control inside it, and
the form posts exactly what it always posted.

The first one is `<aa-date-input>` (`app/public/js/components/date-input.js`), which gives the legacy
Mantine `DateInput` look (a text field reading `April 11, 2026`, no browser calendar button) to the
report/ledger filter dates ([[tb-0023-guest-feature-parity]] item D) while keeping the real
`<input type="date">` underneath as the submitted value.

## Three rules a component must keep

1. **The native control stays in the form.** It keeps its `name`, `value`, `required` and `disabled`.
   The element replaces how the control *looks and is picked from*, never what is submitted. This is
   the same contract `autocomplete.js` keeps for `<select>` ([[reference-lists-come-from-indexeddb]]).
2. **No JavaScript means no change.** The element must leave a working form control in place when it
   is not upgraded. This is what keeps the app honest against
   [[minimise-client-side-calculation]] — the component is an enhancement, not a dependency.
3. **It must not disturb the keyboard layer.** The hotkey layer walks `main form` fields
   (`hotkeys.js` `fields()`); a component that hides a control must take it out of the tab order
   (`tabindex="-1"`) and out of that field set, or `Alt+ArrowDown` walks onto an invisible input and
   appears to do nothing. The `<aa-date-input>` native input carries `.aa-date-native`, which both the
   tab order and `fields()` exclude.

## Why

- The same control appears in ~20 places (report filters, every ledger, the invoice/payment/cash-memo
  lists and entry forms). A per-page inline script would be that code twenty times; a component is one
  declaration referenced by a tag.
- A custom element reads as part of the markup in a Minijinja template — no include of a script and a
  selector to keep in sync — which is the same reason the runtime moved generic capability into the
  guest rather than the templates ([[runtime-js-guest-platform]]).
- It is testable in isolation and in the browser gates the restyle already uses
  (`ui-capture.mjs`, the CDP checks).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Per-page inline JS | Duplication across ~20 templates; the things that drift are exactly the copies |
| Adopt a client framework (React/Vue) | Contradicts the minimal-client-JS direction; a single form control does not justify a runtime |
| Leave the native `input[type=date]` | It is the browser's control, which is the discrepancy (item D); cannot be made to look like Mantine's |
| Build a full custom calendar widget | A second date-picker implementation to keep correct; `showPicker()` reuses the browser's own, with a reveal-the-native fallback |

## Consequences

- New interactive features should be evaluated for reuse before being written page-local; if two
  screens need the same control, it becomes an `<aa-…>` component.
- Components live under `app/public/js/components/` and are loaded from `layout.html.jinja` in the same
  `defer` block as the existing enhancements.
- A component's own state (e.g. mirroring a native input's value) must round-trip through the native
  control, so anything that reads the form — the smoke suite, a report query parse — is unaffected.

## Related

- [[tb-0023-guest-feature-parity]] — the work item that needed the date control.
- [[minimise-client-side-calculation]] — why the enhancement must degrade to working markup.
- [[reference-lists-come-from-indexeddb]] — the same "native control stays in the form" contract.
