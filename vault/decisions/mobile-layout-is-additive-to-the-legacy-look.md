---
title: "The mobile layout is additive — the legacy look is preserved above 768px"
type: decision
status: accepted
decided_on: 2026-09-29
created: 2026-09-29
tags: [ui, mobile, responsive, css, parity, trailbase, guest]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-guest-feature-parity]]", "[[tb-0028-guest-transactional-screens-and-mobile]]", "[[report-render-row-cap]]", "[[rendered-page-cache]]"]
---

# The mobile layout is additive — the legacy look is preserved above 768px

> **Partly superseded 2026-10-05 — its rule survives, its reason does not.**
>
> The rule — **mobile is additive, never a separate app: one set of routes, one set of capabilities, a
> narrow layout on top** — is unaffected and remains the rule.
>
> What no longer holds is the premise. The Context below justifies it by "same look, so the cutover
> needs no retraining", and [[parity-is-functional-not-visual]] withdrew the visual mandate, so there is
> no "legacy look" left to preserve. The title names it too, which is why this banner exists rather than a
> quiet edit. **Read the decision as: mobile is additive because one capability set is easier to defend
> than two — not because of what anything looks like.** The measurements under it (a 14-column report
> table, an 80px rail eating 27% of a 360px screen, sub-44px tap targets) are unaffected by that change
> and still stand.

## Context

~~[[guest-ui-is-a-direct-shift-of-legacy]] makes the guest UI a direct shift of the legacy Next.js
UI: same look, so the cutover needs no retraining.~~ **That premise was withdrawn 2026-10-05** — see
[[parity-is-functional-not-visual]] — but the layout problem below was never about looks, and the fix is
unchanged. That was written against a desktop layout — an
80px icon rail, 10em tiles, dense 12px tables with black borders, 36px inputs. On a phone all of
that is unusable: the rail eats 27% of a 360px screen, a report table is 14 columns wide, and the
tap targets are under the 44px minimum.

Adapting it means either changing the desktop rendering (breaking the parity the decision exists
to protect) or adding a second layout below a breakpoint.

## Decision

**Responsive rules are additive and mobile-scoped.** Every layout change lives inside
`@media (max-width: 768px)` in `app/public/css/app.css`. Above 768px the guest renders exactly as
it did on 2026-09-28 — the parity screenshots still match.

Below 768px:

- the 80px rail becomes a **fixed bottom navigation bar** (thumb reach, and it never competes with
  the browser chrome at the top);
- filter fields go full width, one per row, instead of a wrapping flex row;
- inputs, selects and buttons get a **44px minimum height**;
- data tables become **stacked cards**: each `<td>` carries `data-label` and renders as its own
  row with the column heading. Wide report tables stay scrollable as a fallback, because a 14-column
  profit report reads better as a scroll than as 14 stacked cards;
- totals, the report meta line and the tile grid wrap instead of overflowing.

New screens added under this rule are designed mobile-first and given a desktop layout by the same
sheet — the mobile rules are not a retrofit tax, they are the base.

## Why not the alternatives

| Alternative | Why not |
| --- | --- |
| Rework the layout at every width | Breaks [[guest-ui-is-a-direct-shift-of-legacy]] for desktop staff, and the desktop screenshots are the parity evidence. Chosen against. |
| Horizontal scroll only, no card layout | Cheapest, but a phone user scrolls sideways through a 14-column report to read two numbers. Tables that fit get cards; the rest keep the scroll. |
| A separate mobile site or a native app | Two UIs to keep truthful. The whole point of the guest is one server, one port, one set of runtime files. |
| A CSS framework | The palette is already a ported Mantine 7 token set; a framework would re-solve what is solved and add a build step, against [[trailbase-guest-wasm-runtime-defaults]] D2. |

## Consequences

**Accepted**

- One stylesheet, no build, no new static asset beyond what already ships.
- Desktop parity is provable by diffing the rendered HTML/CSS at any width above the breakpoint.
- The demo is usable on a phone without touching the report arithmetic or the runtime routing.

**Given up / to watch**

- **Two layouts to keep true.** A screen added later without `data-label` on its cells will render
  as an unlabelled card list on a phone. The rule is the marker.
- **The breakpoint is one number.** A 769px tablet in portrait gets the desktop rail, which is the
  right call but was not re-measured against the legacy screenshots.
- **Printing is untouched** by this decision — `@media print` is a separate context and the new
  screens have no print template yet ([[tb-0021-invoices-cashmemos-printing]]).

## Evidence

- `trailbase/runtime/app/public/css/app.css` — the `@media (max-width: 768px)` block, and the
  `data-label` rules it drives.
- `trailbase/runtime/app/views/partials/table.html.jinja` — every `<td>` now carries its column label.
- `trailbase/runtime/app/views/partials/nav.html.jinja` — the same rail markup that becomes the bottom bar.
- [[tb-0028-guest-transactional-screens-and-mobile]] — the screens built under this rule.

## Related

- [[guest-ui-is-a-direct-shift-of-legacy]] — the decision this amends, without weakening it.
