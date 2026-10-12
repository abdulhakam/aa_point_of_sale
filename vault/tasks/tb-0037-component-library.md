---
title: "Native component library (light DOM, server descriptors)"
type: task
status: doing
priority: medium
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, frontend, web-components, dx]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[components-consume-server-descriptors]]", "[[features-as-native-web-components]]", "[[money-inputs-distinguish-amounts-from-rates]]", "[[component-library-2026-10-09]]", "[[tb-0036-htmx-navigation]]"]
---

# Native component library (light DOM, server descriptors)

Reusable UI components for the guest: one file each, light DOM, styled by the single global
stylesheet, consuming server descriptors. Rule and rationale: [[components-consume-server-descriptors]].

## Done (2026-10-09)

- [x] **`<aa-live-time>`** (`public/js/components/live-time.js`) — the header clock, ticking every
      second and pausing while the tab is hidden. Replaced the `app.js` clock, which painted seconds
      on a 30 s interval. Wired in `partials/topbar.html.jinja`; `aa-live-time { display:block }` in
      `app.css`; the `tick`/`setInterval` removed from `app.js`.
- [x] **Entity field `hidden`/`disabled`** — `entities.json` fields may carry either (`true`/`false`, a
      mode, or a mode array); `management.formFields(entity, row, options, links, mode)` resolves them;
      `partials/entity_fields.html.jinja` renders `type=hidden` and `disabled`.
- [x] **Read-only `view` mode** — `?view=<id>` on a management entity renders the panel with every
      field disabled and no submit; the eye icon links to `?view=` (the pencil stays `?edit=`). This is
      the concrete user of the `disabled` mechanism and fixes the eye/pencil conflation.
- [x] Gates: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62 (harness `Ctrl+Enter` check now polls the URL
      instead of sleeping a fixed 1.2 s, which raced the htmx APPLY round-trip), `grid-preview-check`
      14/14, `print-queue-check` 14/14.

## Done (2026-10-09, continued) — the component slice

- [x] **`<aa-money>`** (`public/js/components/money.js`) — amount mode normalises to 2 dp, `rate` mode
      keeps the stored precision and sets `step="any"`. Wired through the invoice grid, entry, payments,
      expenses, inventory, quick-create, the general-ledger openings and the management `items` prices
      (`entities.json` `"money": "rate"`). Rule: [[money-inputs-distinguish-amounts-from-rates]].
- [x] **`<aa-entity-form>`** (`public/js/components/entity-form.js`) — inline required messages, an
      inline surface for a bare 4xx/5xx, and disabled-during-flight. Wrapped around the management,
      payments, expenses, inventory and invoice write forms.
- [x] **`<aa-flash>`** (`public/js/components/flash.js`) — a lifetime and a dismiss control for the
      server-rendered `.flash` banner; the markup is unchanged.
- [x] **Invoice entry component `<aa-invoice-entry>`** (`public/js/components/invoice-entry.js`) —
      wraps `views/invoices/entry.html.jinja`, consumes the server `type`/`can-write` descriptor, and owns
      the item→price fill (replacing `app.js` `enhanceLineEditor`, now removed). It never switches on
      the type for data — the server already rendered the type's fields.
- [x] **Fixed a latent no-JS `stepMismatch`**: a rate input rendered `step="0.01"` while stored rates
      are not 2 dp; now `step="any"` in the markup as well as in the component.
- [x] **New gate `tools/component-check.mjs`** — 19 checks in real Chrome; it found **two defects** on
      first run (the `decimals` default and the entity-form message never showing).
- [x] Gates green: `component-check` 19/19, `guest-smoke` 116/116, `grid-preview-check` 14/14,
      `autocomplete-check` 39/39, `refdb-check` 12/12, `hotkey-check` 62/62, `print-queue-check` 14/14,
      `route-snapshot` 50/0. Evidence: [[component-library-2026-10-09]].

## Done (2026-10-10) — the invoice-console components

- [x] **`<aa-invoice-view>`** (`public/js/components/invoice-view.js`) — the keyboard invoice console's
      controller: the picker -> booker -> party -> date -> create walk, the `0`/`999`/`000`/`up` state
      machine, the line walk and `PATCH`-on-Enter of an edited row. Consumes the server's
      `data-type`/`data-state`/`data-can-write`/`data-invoice` descriptors; progressive enhancement
      over forms that already post. Decision: [[invoice-console-keyboard-state-machine]].
- [x] **`<aa-item-search>`** (`public/js/components/item-search.js`) — the `000` advanced item-search
      dialog, a client filter over the refdb `items`/`companies` cache (no new endpoint). Opened by the
      synthetic `000` row `autocomplete.js` now appends (`shown()`/`choose()`, gated on
      `data-adv-search`).
- [x] Gate `tools/invoice-view-check.mjs`; `guest-smoke` 116/116. Evidence:
      [[invoice-console-build-2026-10-10]].

## Planned (not done)

- [ ] **`<aa-dirty-guard>`** — confirm before leaving an unsaved form (the legacy had confirm-on-navigate;
      more relevant now that the shell survives a nav). **Deferred with a reason:** it interacts with
      every browser gate that types into a form and then navigates, and needs dialog handling in the
      harnesses first. See [[component-library-2026-10-09]].
- [ ] Consider extending `entities.json` usage of `disabled` to a real immutable field once a business
      rule is agreed (currently only `view` exercises it). `hidden` is supported but no entity uses it
      yet.

## Related

- [[components-consume-server-descriptors]] — the decision.
- [[features-as-native-web-components]] — the base contract.
