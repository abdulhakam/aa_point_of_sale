---
title: Direct-shift the legacy UI onto the guest, screen for screen
type: task
status: doing
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

- [x] Restyle the existing guest screens (login, dashboard, reports, ledgers, management) to the
      captured legacy look: layout, navigation, tiles, table styling, filters. Done 2026-09-27 —
      AppShell port (52px header + 80px Tabler icon rail, active chip), gray-0 hub cards with
      white 10em tiles, black-bordered report tables, Mantine inputs/buttons, legacy login Paper.
      Verified `guest-smoke` in full.
- [ ] Build the missing transactional screens ([[guest-frontend-feature-parity-gaps]] §1,
      [[tb-0021-invoices-cashmemos-printing]]): invoice entry for four types, orders, printing +
      print queue, standalone invoice view, and the cash-memo surfaces.
- [x] Reproduce the legacy printout header (`SAMPLE TRADERS` + address + phone) as configuration
      rather than the `APP_NAME` placeholder ([[environment]]). Done 2026-09-27: the identity is
      read from the optional `trailbase/runtime/app/config/business.json` (legacy values as the
      built-in default in `route.ts`), and feeds the header brand and the report `.print-head`.
      Verified by overriding the file and seeing the rendered brand change without a rebuild.
- [x] Screenshot-diff the ported pages against [[legacy-ui-reference-captures]]. Done 2026-10-05 —
      `tools/guest-capture.mjs` captured 32 guest screens at the reference's 1600×900 and the
      discrepancies were settled one by one: [[ui-parity-discrepancies-2026-10-05]]. Ten fixed, of which
      two were not cosmetic — the Profit and Item Sales reports printed the invoice number as a float
      (`1.0`) because `transactions.sql` selected a REAL raw, and the report period had never rendered at
      all because the frame carries no `meta`. Nine remain (items A–I), of which **A — the management
      screens carrying an inline create form, a count badge and card wrappers where legacy has a bare
      filter row and a table — needs a decision, not work.**
- [ ] Rule on the nine remaining discrepancies in [[ui-parity-discrepancies-2026-10-05]] (A–I).
- [ ] Rule on the category-4 differences in [[guest-frontend-feature-parity-gaps]] (opening
      balances, report-filter gating) and record the ruling.

⚠️ **The comparison is against the 2026-09-27 captures, not the running legacy app.** The legacy app
answers "Please log in to continue" on every screen and no legacy credential is recorded, so a live
side-by-side on the same data was not possible. It is the one gap in the method and it needs the legacy
password to close.

✅ **The gap is closed — the comparison was re-run against the RUNNING legacy app** once the operator
supplied its login, via `ui-capture.mjs --system both`. The 2026-09-27 captures were validated against
it and are **faithful**: the live legacy dashboard is pixel-identical to `02-dashboard.png`, so the ten
fixes above stand.

The live run found four things the captures could not:

- a **"Filter Data" modal** behind the top-left glyph on the legacy report screens — so legacy has an
  inline filter row *and* a modal, and it is an open question whether printing is behind that glyph at all;
- legacy report tables have **no `<th>` at all** (the header row is `<td>`s), so the guest's
  `<th>` + uppercase matches the look by a different mechanism and differs in what a screen reader is told;
- some legacy reports print **raw `snake_case` column names** — `COMPANY  NAME  CP  QTY  BOX_SIZE_QTY
  STOCK_AMOUNT` — where the guest renames them to `Carton Size`, `Stock Amount`. A deviation **in the
  guest's favour**, and a ruling is needed: friendly labels everywhere, or faithful labels everywhere;
- guest body links are **pure black** (`rgb(0,0,0)`) against legacy's grey (`rgb(73,80,87)`), on every
  screen with a link. The cheapest remaining fix, and it is systematic.

Making a two-app comparison honest also cost **four fixes to the harness itself**, each of which had
been producing a confident wrong answer rather than an obvious failure — a class-based extractor that
could not match Mantine, swapped only-guest/only-legacy labels, a wait that read true before a
client-rendered app had loaded, and a login wait on `!pathname.includes("login")` when the legacy login
path is `/auth`. All four are written up in [[ui-parity-discrepancies-2026-10-05]] Part 2.

- [ ] Decide, per category-5 item, whether the new-side-only screens (Companies, `/p`, plugins)
      converge with legacy or are accepted as additions.

## Progress

### 2026-09-27 — the shared look is ported (existing screens)

The guest's look is centralized, so the port touched few files: `views/layout.html` (AppShell),
`views/partials/topbar.html` (header), `views/partials/nav.html` (icon rail),
`views/partials/icons.html` (new — inline Tabler glyphs from
`frontend/node_modules/@tabler/icons`), and `public/css/app.css` (Mantine 7 tokens rewritten from
the captures). Hub/detail views were reshaped to the legacy markup: dashboard + REPORTS hub cards
with white 10em tiles, `Manage` as an `h1` with subtle buttons, login as the legacy centered Paper.

Faithful-but-noted deviations, each a deliberate choice rather than an oversight:

- **Business identity defaults to `SAMPLE TRADERS`** (header brand and `<title>`), read from
  `app/config/business.json` with the legacy values as the built-in default in `route.ts`; the
  report print header uses the same name/address/phone. Editing the JSON changes it without a
  rebuild ([[environment]]).
- **The dashboard keeps its `Overview` counter card** below the tiles. The legacy dashboard has only
  the tile card, but `guest-smoke` asserts the `Overview` heading, so removing it would break the
  suite; recorded as a known divergence.
- **The icon rail shows Main / Reports / Management** (the legacy routes that exist), with Pages,
  Plugins, the background-refresh dot and Logout in the rail footer. The legacy `Invoices` and
  `Cash Memo` icons cannot appear until those screens are built ([[tb-0021-invoices-cashmemos-printing]]).
- **Item-company hubs use the legacy per-report icons** (added as `icon` on `REPORT_INDEX` /
  `LEDGER_INDEX` in `app/lib/report-pages.js`, mirroring `frontend/src/app/app/reports/page.tsx` and
  `ledgers/page.tsx`).

Not yet done here: the missing transactional screens (next checkbox), the category-4/5 rulings, and
screenshot-diffing the ported pages against [[legacy-ui-reference-captures]].

## Definition of done

Every route in [[route-map]]'s legacy column has a guest equivalent that matches
[[legacy-ui-reference-captures]], or is explicitly and recordedly dropped.

## Related

- [[guest-frontend-feature-parity-gaps]] — the gap list.
- [[tb-0021-invoices-cashmemos-printing]] — the transactional build.
- [[pos-0028-decide-cutover-plan]] — the cutover decision this unblocks.
