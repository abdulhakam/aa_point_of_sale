---
title: "Non-report UI interaction parity, 2026-10-10 — keys and dialogs"
type: note
status: active
created: 2026-10-10
system: both
tags: [parity, ui, interaction, keyboard, dialogs, guest, legacy, evidence]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[ui-parity-run-2026-10-10]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[tb-0023-guest-feature-parity]]", "[[tb-0037-component-library]]", "[[legacy-ui-reference-captures]]"]
---

# Non-report UI interaction parity, 2026-10-10 — keys and dialogs

Requested: a UI parity report for the **non-report** screens only, including **how and when a dialog
opens** and **what happens when a key is pressed** — neither of which the static `ui-capture.mjs`
sees. Guest at `127.0.0.1:4000`, legacy Next.js at `127.0.0.1:3000`, PocketBase at `127.0.0.1:8090`.

## Method

New tool `trailbase/tools/ui-interaction-capture.mjs` — headless Chrome over CDP (same plumbing as
`hotkey-check.mjs`), driving both apps. Per non-report screen it records:

- **keys[]** — one entry per key in a fixed set (`?`, `Esc`, `/`, `j`, `k`, `g`, `G`, `f`, `Ctrl+K`,
  `:`, `Alt+↓`): the URL, focused element and any visible overlay afterwards. A key that changes
  nothing is recorded as changing nothing.
- **triggers[]** — one entry per control whose label matches an "opens something" vocabulary
  (`add new` / `new` / `create` / `+` / `filter` / `menu` / `more` / `settings`): whether an overlay
  opened, its text, and whether the click **navigated** instead. Destructive controls
  (delete/remove/save/complete/import/logout/submit/confirm/refresh) are never clicked, and any
  overlay is closed with Escape. Read-only by construction.

Evidence: `vault/attachments/ui-interaction-2026-10-10/{guest,legacy}/interactions.json` (local, not
committed).

⚠️ **Coverage limit — the guest arm is complete; the legacy arm is partial.** In a single run
`ui-capture.mjs` also showed the legacy Mantine app hydrates and re-validates its session variably, so
screens sometimes sat on the "Please log in to continue" gate or had not rendered their controls when
probed. The legacy findings below are what the run observed live plus source/vault evidence, marked as
such; a follow-up should give legacy a longer content-aware settle.

## 1. Keyboard — the guest has a layer, legacy has none

**Guest: fully observed.** Every non-report screen answered the keyboard layer:

| key | observed reaction (per screen where it applies) |
|---|---|
| `?` | opens the **Keyboard help overlay** (`"Keyboard … This list is built from this page…"`) |
| `Ctrl+K` / `:` | opens the **"Jump to…" command palette** over the page's links |
| `/` | focuses the filter / search box (`focus=INPUT:`) |
| `f` | focuses the first field on the page (`focus=INPUT:`) |
| `j` / `k` | moves the row/tile cursor (`focus=TR:` on a table, `focus=A:` on the dashboard/hub tiles) |
| `G` | jumps to the last row/tile |
| `Alt+↓` | moves to the next form field |
| `Esc` | closes an overlay / clears the cursor |

This is the layer documented in [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]], re-driven
live.

**Legacy: no app-level keyboard layer.** Across the non-report screens the run reached, **no key
produced any change** — no overlay, no focus move, no navigation. Legacy is mouse-first; its keys are
the browser's.

**Parity verdict:** the keyboard is a **guest-only capability**. It is not a divergence to fix — the
guest layer is an accelerator over markup that already works and was deliberately made never the only
way to anything — but the two apps are **not 1:1 on keys, by design**.

## 2. Dialogs and overlays

**Guest**

| screen | control | result |
|---|---|---|
| invoice entry — sale / purchase / return | the blue **`+`** beside the party | opens the `<aa-modal>` **"Create New Customer/Supplier/Party"** (observed) |
| invoice entry — difference | (no `+`) | no dialog — the difference screen has no party field (observed: no trigger) |
| management (all entities) | **`add new`** | **navigates to `?new=1`** — an inline create **page state**, not a modal (observed) |
| management hub | **`settings`** | navigates to `/settings` (observed) |
| management list, row delete | trash button | `hx-confirm` → native browser confirm (source) |
| report filter modal | (reports — out of scope) | `<aa-modal>` on stock/difference |

**Legacy**

| screen | control | result |
|---|---|---|
| management | **`Add New`** | opens a Mantine **"Create New"** modal (observed live on `management-items`; the modal body carried the entity's fields and a Create button) |
| invoice entry | the blue **`+`** beside the party | opens a "Create New Customer/Supplier" dialog (vault/source; not live-captured this run) |
| management list, row delete | delete | a Mantine confirmation modal (vault/pattern; not live-captured this run) |

**Parity verdict — one real interaction-shape divergence:**

- **Management create.** Legacy opens a **modal** ("Add New" → "Create New") on the list; the guest
  **navigates to `?new=1`** and renders an inline create panel in place. Same capability, different
  interaction shape. Decide whether to match legacy's modal here (the guest's `?new=1` is a page
  state, so it is deep-linkable and works without JS — the reason it was built that way).
- **Invoice create-customer** matches in kind: both open a modal from the party `+`.
- **Delete confirmation** differs in kind: legacy uses its own modal, the guest uses the browser's
  native `confirm()` (via `hx-confirm`). Functionally equivalent, visually not.

## 3. What the probe could not settle

- The legacy management create modal's exact fields/buttons beyond the observed title, and legacy's
  delete confirm and invoice `+` dialog, because the legacy arm did not reliably reach those controls.
- The guest's `?new=1` panel content (it is a full page fragment, not an overlay, so the probe records
  it as a navigation).
- Mobile/thumb interactions (out of scope for this run).

## Sources

- `trailbase/tools/ui-interaction-capture.mjs` — the probe.
- `vault/attachments/ui-interaction-2026-10-10/` — raw per-screen interaction JSON.
- `runtime/app/views/**` — the guest's `hx-confirm`, `<aa-modal>`, `?new=1` markup.
- [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]] — the guest keyboard layer's design.
- [[ui-parity-run-2026-10-10]] — the static structure run (this note is its interaction companion).

## Related

- [[ui-parity-run-2026-10-10]] — the structural comparison; this is the interaction companion.
- [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]] — the guest keyboard layer.
- [[tb-0037-component-library]] — where `<aa-modal>`, `<aa-entity-form>` and flash live.
- [[tb-0023-guest-feature-parity]] — the owning parity work.
