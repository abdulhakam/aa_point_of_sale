---
title: "Native component library (light DOM, server descriptors)"
type: task
status: doing
priority: medium
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, frontend, web-components, dx]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[components-consume-server-descriptors]]", "[[features-as-native-web-components]]", "[[tb-0036-htmx-navigation]]"]
---

# Native component library (light DOM, server descriptors)

Reusable UI components for the guest: one file each, light DOM, styled by the single global
stylesheet, consuming server descriptors. Rule and rationale: [[components-consume-server-descriptors]].

## Done (2026-10-09)

- [x] **`<aa-live-time>`** (`public/js/components/live-time.js`) — the header clock, ticking every
      second and pausing while the tab is hidden. Replaced the `app.js` clock, which painted seconds
      on a 30 s interval. Wired in `partials/topbar.html`; `aa-live-time { display:block }` in
      `app.css`; the `tick`/`setInterval` removed from `app.js`.
- [x] **Entity field `hidden`/`disabled`** — `entities.json` fields may carry either (`true`/`false`, a
      mode, or a mode array); `management.formFields(entity, row, options, links, mode)` resolves them;
      `partials/entity_fields.html` renders `type=hidden` and `disabled`.
- [x] **Read-only `view` mode** — `?view=<id>` on a management entity renders the panel with every
      field disabled and no submit; the eye icon links to `?view=` (the pencil stays `?edit=`). This is
      the concrete user of the `disabled` mechanism and fixes the eye/pencil conflation.
- [x] Gates: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62 (harness `Ctrl+Enter` check now polls the URL
      instead of sleeping a fixed 1.2 s, which raced the htmx APPLY round-trip), `grid-preview-check`
      14/14, `print-queue-check` 14/14.

## Planned (not done)

- [ ] **`<aa-entity-form>`** — submit the server-rendered entity form over htmx, disabled-during-flight,
      inline error surface. Pairs with the **write surface** conversion ([[tb-0036-htmx-navigation]]
      follow-up C) and flash OOB.
- [ ] **`<aa-money>`** — a 2 dp money input, centralising [[money-is-2dp-everywhere]]; the invoice
      grid's client recalc already needs it.
- [ ] **`<aa-flash>` / `<aa-toast>`** — render the out-of-band flash a write response returns.
- [ ] **`<aa-dirty-guard>`** — confirm before leaving an unsaved form (the legacy had confirm-on-navigate;
      more relevant now that the shell survives a nav).
- [ ] **Invoice entry component** — unify purchase/sale/return/difference entry **after** C, consuming
      a server `type` descriptor; never a client-side type→table switch.
- [ ] Consider extending `entities.json` usage of `disabled` to a real immutable field once a business
      rule is agreed (currently only `view` exercises it). `hidden` is supported but no entity uses it
      yet.

## Related

- [[components-consume-server-descriptors]] — the decision.
- [[features-as-native-web-components]] — the base contract.
