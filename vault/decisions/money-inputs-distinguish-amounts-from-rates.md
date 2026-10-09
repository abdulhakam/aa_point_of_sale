---
title: "Money inputs distinguish amounts from rates; <aa-money> centralises the rule"
type: decision
status: accepted
decided_on: 2026-10-09
created: 2026-10-09
updated: 2026-10-09
tags: [money, precision, guest, ui, frontend, web-components, invoices]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[money-is-2dp-everywhere]]", "[[client-side-live-recalculation]]", "[[minimise-client-side-calculation]]", "[[components-consume-server-descriptors]]", "[[features-as-native-web-components]]", "[[tb-0037-component-library]]", "[[component-library-2026-10-09]]"]
---

# Money inputs distinguish amounts from rates; `<aa-money>` centralises the rule

## Context

Two rules already existed and were being kept by hand at every money field:

- **An amount is 2 dp** everywhere ([[money-is-2dp-everywhere]]): a value that is summed, transported
  or displayed must be exactly two decimal places. `1.5` should read `1.50`.
- **A rate is not an amount and must not be rounded to 2 dp.** A unit price or cost is a rate, and the
  imported legacy data holds rates like `114.583333` (a price of 1375/12). Rendering that into an
  *editable* input as `114.58` silently rewrites the ledger on save — the defect found and fixed in
  [[minimise-client-side-calculation]] point 3 and decided in [[client-side-live-recalculation]].

The two rules pull in opposite directions for one control, which is why a single "round to 2 dp" input
is wrong and a single "leave it alone" input is also wrong.

## Decision

**The money input is a component with two modes, and the mode is a server descriptor.**

- **`<aa-money>`** (default) is an **amount**: on `blur`/`change` it normalises the submitted value to
  `decimals` (2). Amounts are 2 dp by rule, so this is the correct and only rounding site.
- **`<aa-money rate>`** is a **rate**: it **never reduces the stored precision**. It only trims, and it
  sets `step="any"`.
- **The server template renders a rate with `step="any"` too.** A rate stored as `114.583333` is not a
  multiple of `0.01`, so `step="0.01"` marks it `validity.stepMismatch` and the browser refuses a plain
  form submit. htmx submits over XHR and never runs constraint validation, which hid this — but the
  app is required to work without JavaScript, and the no-JS path would have been blocked.

The modes stay consumed-not-owned ([[components-consume-server-descriptors]]): `entities.json` marks a
field `"money": "rate"`, and the template chooses the tag. The component carries no schema.

## Why not one mode

- **Round everything to 2 dp:** rewrites stored rates on save (the ledger defect above) and makes the
  grid's live preview disagree with the server.
- **Round nothing:** an operator typing `1.5` into a payment amount keeps an amount with one decimal
  place, against [[money-is-2dp-everywhere]].
- **A client-side amount/rate switch by field name:** a second schema in JavaScript, which is exactly
  the drift [[components-consume-server-descriptors]] forbids.

## Evidence (2026-10-09)

- `trailbase/runtime/app/public/js/components/money.js` — the two modes; `step="any"` for a rate.
- `trailbase/tools/component-check.mjs` — asserts an amount input normalises to 2 dp, a rate input keeps
  `114.583333` (the depot's real value) and is `step="any"`, and an amount is `step="0.01"`. **19/19.**
- The memoised footgun: `Number(getAttribute("decimals"))` reads an absent attribute as `0`
  (`Number(null) === 0`), so a bare `<aa-money>` briefly normalised to **integer** decimals — the gate
  caught it (`1.5` -> `2`, `7` -> `7`). Fixed by checking `hasAttribute` first.
- `vault/notes/component-library-2026-10-09.md` — the whole component slice and its gates.

## Consequences

- A new money field chooses its mode in the template/markup; a new **rate-like** column is declared
  `"money": "rate"` in `entities.json` so the management form renders it correctly.
- `client-side-live-recalculation`'s rule — "the editable input carries the stored value" — is now
  enforced by a component instead of by convention at each site.
- The `step="0.01"` on a rate is a defect class to watch: any new editable rate must be `step="any"`.
