---
title: TB-0040 Invoice console keyboard-first surface
type: task
status: doing
priority: high
created: 2026-10-10
updated: 2026-10-12
tags: [invoices, keyboard, ui, component, guest, pos]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-console-keyboard-state-machine]]", "[[invoice-console-preview-is-live-not-materialised]]", "[[invoices-are-soft-deleted]]", "[[invoice-print-sheet-legacy-metrics]]", "[[tb-0021-invoices-cashmemos-printing]]", "[[tb-0037-component-library]]", "[[invoice-console-build-2026-10-10]]"]
---

# TB-0040 Invoice console keyboard-first surface

Rebuild the guest invoice screen as one keyboard-first surface (the plan
`.kilo/plans/1791600000000-invoice-view-keyboard-redesign.md`).

## Done (2026-10-10)

- [x] `views/invoices/console.html.jinja` + `components/invoice-view.js` (`<aa-invoice-view>`) +
      `components/item-search.js` (`<aa-item-search>`) at `GET /invoices/new?type=N` / `?invoice=<id>`.
- [x] Backend: fragment create on `POST /invoices/new`; `PATCH /invoice/<id>/line/<lineId>` via
      `lifecycle.editLine`; `buildSheetFresh` + `?source=live`; composite party `label`;
      `POST /invoices/<id>/delete` soft delete; the entry/grid write routes re-render the console on
      `surface=console`.
- [x] `autocomplete.js` `000` advanced-search row; print A5 margins + `BOX SIZE`/`UNTS` widths.
- [x] `tools/invoice-view-check.mjs`; `guest-smoke` 116/116.
- [x] Vault: state-machine decision, live-preview decision, soft-delete decision, print-metrics
      reference, build note.

## Remaining

- [x] Automated headless-Chrome keyboard gate (focus walk, real `up`/`Enter`/`000`/`999`). Done
      2026-10-12: `tools/invoice-console-check.mjs` drives the console with real keystrokes (read-only:
      it never submits). It found three real defects — Enter on `NEW` picked the newest invoice, `0` did
      not exit, and Enter would not advance past an enhanced combobox — all fixed;
      [[console-keyboard-defects-found-by-the-gate]]. Gate 13/13, and `autocomplete-check` 39/39,
      `hotkey-check` 62/62, `guest-smoke` 117/117, `route-snapshot` 50/0 after.
- [ ] Retire `invoicing.js`'s line writers in favour of `invoice-lifecycle.js` (the two still coexist).
- [x] Composite party `label` through `refdb.js`'s option spec so it survives a version-change
      rebuild. Done 2026-10-12: `/data/refs` projects parties with the server's
      `A.invoices.partyLabel` (`name - area - section`) and `spec.parties = { label: "label" }`;
      `/quick-create` returns the same `label` on a created party, and `refdb.js` falls back to
      `name` when a partial row has no `label`. Verified in headless Chrome against the production
      depot (`applyAll()` renders `ANSAR G/S - MALIK CENTER - MAIN MARKET`) and `refdb-check` 12/12
      (its synthetic inserted row also passes). `refdb-check` gained `--cookie` so it can run against
      a depot whose admin password is not the scaffold default.
- [ ] Legacy-PDF pixel diff for the auto print columns.
- [ ] The finish flow opens an in-dialog "Print preview" link rather than auto-opening a print tab.
