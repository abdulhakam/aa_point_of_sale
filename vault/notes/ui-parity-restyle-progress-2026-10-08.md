---
title: Legacy-look restyle progress, 2026-10-08
type: note
status: active
created: 2026-10-08
updated: 2026-10-08
tags: [guest, ui, parity, legacy, evidence, restyle]
related_to: ["[[ui-parity-discrepancies-2026-10-05]]", "[[tb-0023-guest-feature-parity]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[features-as-native-web-components]]", "[[legacy-ui-reference-captures]]"]
---

# Legacy-look restyle progress, 2026-10-08

First restyle increment under [[parity-reinstates-the-legacy-look-with-defect-fixes]] (plan A1 + the
cheap items of A2), with the fresh discrepancy list regenerated rather than carried forward.

## How the list was produced

- Guest captures refreshed: `node trailbase/tools/ui-capture.mjs --system guest` → 28 screens at
  1600×900 into `vault/attachments/ui-capture/guest/`.
- Diff: `node trailbase/tools/ui-parity-report.mjs` → 28 screens compared, **28 still with at least
  one difference**.
- The **legacy arm is the frozen capture set** in `vault/attachments/ui-capture/legacy/` and
  `vault/attachments/legacy-ui/`. The live legacy app needs PocketBase credentials held by the
  operator and not recorded anywhere, so `ui-capture.mjs --system both` cannot be run unattended;
  the diff is guest-fresh vs legacy-stored. This is a limitation of the A0 harness, not of the app.

## Fixed in this increment

| Item | Change | Evidence |
|---|---|---|
| **Body link colour** | `a { color: gray-7 }`, not blue | `ui-parity-report` metric `linkColor` no longer differs on any screen |
| **Shared shell font** | appended `"Apple Color Emoji", "Segoe UI Emoji"` to `--font` | metric `bodyFont` now identical |
| **Rail** | five legacy destinations in legacy order (Dashboard, Reports, Invoices, Cash Memo, Management) + Logout at the foot; Payments, Inventory, Print, Pages, Plugins and refresh behind one foot menu | `views/partials/nav.html`; legacy `02-dashboard.snapshot.yml` shows exactly those five links + one button |
| **A — management list** | bare Search row + table, no heading, no count badge, no card wrappers; create form moved behind a `New {singular}` affordance (`?new=1`) | `views/management/list.html`, `routes/management/{entity}/route.ts` |
| **C — management cards** | nested bordered cards removed | same |
| **D — report date inputs** | native `input[type=date]` given the Mantine look by `<aa-date-input>` | [[features-as-native-web-components]]; verified in-browser: text `January 1, 2024`, native `2024-01-01`, name `from` preserved |
| **G — Cash Memo tile glyph** | filled blue € circle (`coin-euro-filled`) | `views/dashboard/index.html` |
| **H — dashboard `Overview` card** | removed; `guest-smoke` assertion changed from "Overview" to "Cash Memo" | `views/dashboard/index.html`, `tools/guest-smoke.mjs:287` |
| **Management table borders** | black, matching legacy (the earlier comment claimed only report tables were black) | metric `thBorder` on `management-parties` was gray-3 vs legacy black |

## Gates run (all green)

- `guest-smoke.mjs` **115/115**
- `route-snapshot.mjs` **49 routes, 0 erroring**
- `autocomplete-check.mjs` **39/39**
- `hotkey-check.mjs` **62/62** (one assertion retargeted — see below)
- `grid-preview-check.mjs` **14/14**
- `refdb-check.mjs` **12/12**

Two test/tooling corrections were needed and are deliberate:

- The hotkey field-navigation assertion ran on the management list, which no longer has a form (item
  A). Retargeted to the list's create panel (`?new=1`), which is where that page now keeps a form.
- `ui-capture.mjs`'s `linkColor` metric sampled the first anchor, which is the guest's header brand
  (`a.brand`, black) and not a content link on the legacy side. It now samples a throwaway `<a>` for
  the base anchor colour, which is comparable across both apps.

## Still open (the rest of A2 and the reopened list)

- **Report filter modal** behind the glyph, in addition to the inline row.
- **Remaining shell metrics** — spacing and per-screen layout, as the captures still show shape
  differences on the report/ledger and invoice screens (tiles, filters order, totals).
- **Return and difference invoice entry** — still unbuilt.
- **Invoice grid create-from-invoice affordance**.
- The two "take or leave" suggestions (remember last filters; sale price beside cost).

## Related

- [[ui-parity-discrepancies-2026-10-05]] — the original nine-item list this re-measures.
- [[tb-0023-guest-feature-parity]] — the work item.
- [[features-as-native-web-components]] — the decision behind `<aa-date-input>`.
