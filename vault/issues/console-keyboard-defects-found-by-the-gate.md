---
title: "Three console keyboard defects the headless gate found"
type: issue
status: fixed
severity: major
created: 2026-10-12
updated: 2026-10-12
tags: [invoices, console, keyboard, combobox, autocomplete, guest, defect, fixed]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[invoice-console-keyboard-state-machine]]", "[[tb-0040-invoice-console-keyboard-surface]]", "[[why-some-selects-are-not-comboboxes]]", "[[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]"]
---

# Three console keyboard defects the headless gate found

**Fixed 2026-10-12.** `tools/invoice-console-check.mjs` drives the console with real
`Input.dispatchKeyEvent` keystrokes (it is the gate tb-0040 was waiting for — a manual pass had not
been turned into a repeatable one). The first run failed 5 of 13 checks; three were implementation
defects against [[invoice-console-keyboard-state-machine]] (the other two were the gate's own
assumptions). All are fixed; the gate is 13/13.

## 1. Enter on `NEW` picked the newest invoice instead of starting a new one

The picker's combobox opened its list on focus, so the first Enter was the combobox's "choose the
highlighted option" — and the highlighted option is the newest invoice, not the blank `NEW` row (which
`autocomplete.js` drops from the list). The state machine says Enter at State 0 starts the walk.

**Fix.** `autocomplete.js` honours a new `data-ac-no-focus-open`: focus no longer auto-opens that
control's list (a click, typing, or ArrowDown still opens it). The pencil/`booker`/`party` walk fields
and the picker carry it, so a programmatic focus in the walk does not open a list the next Enter would
consume. `views/invoices/new/page.html.jinja` adds the attribute.

## 2. `0` in the empty picker did not exit

The exit test read the visible input's text, which shows the blank option's label `NEW`, so
`value.trim() === ""` was never true and `0` was typed into the box. The picker's **value** is `""`.

**Fix.** `invoice-view.js` tests the underlying select's value (`selectOf(target).value`), not the
input text, so `0` exits to `/dashboard` as documented, while a real invoice numbered `0` is still
reachable as an option.

## 3. Enter on the party combobox did not advance to the date

`_walkKey` (and `_lineWalkKey`, `_discountWalkKey`) read `e.target.name`. For an enhanced searchable
select the focused element is the visible `.ac-input`, which has **no name**, so
`order.indexOf("") === -1` and the walk returned without moving. It only "worked" for the booker
because the booker has 4 options and is deliberately left a native select.

**Fix.** A `fieldName(el)` helper falls back to the wrapped select's name; the walk keys use it.

## Gate assumptions corrected

- The booker is a native select (below the 12-option combobox threshold), so the check accepts either
  the select or its input.
- `autocomplete-check.mjs` had asserted a party option reverted to the bare name `G/M TRADERS`; the
  label is now the composite `name - area - section` ([[tb-0040-invoice-console-keyboard-surface]],
  the refdb label fix), so it compares against the chosen option's own text.

## Evidence

- `tools/invoice-console-check.mjs`: read-only walk (picker -> booker -> party -> date), `0` exit,
  and `000`/`999`/`up` on an existing open invoice, all with real keystrokes. **13/13.**
- Regression gates after the fixes: `autocomplete-check` 39/39, `hotkey-check` 62/62, `guest-smoke`
  117/117, `invoice-view-check` all pass, `route-snapshot` 50/0.
- `autocomplete-check.mjs`, `hotkey-check.mjs`, `refdb-check.mjs` gained an optional `--cookie` so a
  browser gate can run against a depot whose admin password is not the scaffold default.
