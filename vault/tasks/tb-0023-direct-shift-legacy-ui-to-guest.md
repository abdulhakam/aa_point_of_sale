---
title: Direct-shift the legacy UI onto the guest, screen for screen
type: task
status: todo
priority: high
created: 2026-09-27
tags: [guest, wasm, ui, parity, legacy, cutover]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-ui-is-a-direct-shift-of-legacy]]", "[[guest-frontend-feature-parity-gaps]]", "[[legacy-ui-reference-captures]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[route-map]]"]
---

# Direct-shift the legacy UI onto the guest, screen for screen

## Goal

Make the guest frontend ([[runtime-js-guest-platform]]) reproduce the legacy Next.js app
([[frontend]]) exactly — same screens, same look, same print output — so the legacy UI can be
retired. The mandate is [[guest-ui-is-a-direct-shift-of-legacy]]; the captured legacy UI is the
reference ([[legacy-ui-reference-captures]]).

## Work

- [ ] Restyle the existing guest screens (login, dashboard, reports, ledgers, management) to the
      captured legacy look: layout, navigation, tiles, table styling, filters.
- [ ] Build the missing transactional screens ([[guest-frontend-feature-parity-gaps]] §1,
      [[tb-0021-invoices-cashmemos-printing]]): invoice entry for four types, orders, printing +
      print queue, standalone invoice view, and the cash-memo surfaces.
- [ ] Reproduce the legacy printout header (`SAMPLE TRADERS` + address + phone) as configuration
      rather than the `APP_NAME` placeholder ([[environment]]).
- [ ] Rule on the category-4 differences in [[guest-frontend-feature-parity-gaps]] (opening
      balances, report-filter gating) and record the ruling.
- [ ] Decide, per category-5 item, whether the new-side-only screens (Companies, `/p`, plugins)
      converge with legacy or are accepted as additions.

## Definition of done

Every route in [[route-map]]'s legacy column has a guest equivalent that matches
[[legacy-ui-reference-captures]], or is explicitly and recordedly dropped.

## Related

- [[guest-frontend-feature-parity-gaps]] — the gap list.
- [[tb-0021-invoices-cashmemos-printing]] — the transactional build.
- [[pos-0028-decide-cutover-plan]] — the cutover decision this unblocks.
