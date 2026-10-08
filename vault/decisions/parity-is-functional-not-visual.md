---
title: Parity with legacy is functional, not visual
type: decision
status: superseded
superseded_by: "[[parity-reinstates-the-legacy-look-with-defect-fixes]]"
decided_on: 2026-10-05
created: 2026-10-05
updated: 2026-10-07
tags: [frontend, guest, parity, ui, cutover, legacy, mandate, supersedes]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[guest-frontend-feature-parity-gaps]]", "[[tb-0023-guest-feature-parity]]", "[[legacy-ui-reference-captures]]", "[[ui-parity-discrepancies-2026-10-05]]", "[[runtime-js-guest-platform]]", "[[keep-legacy-stack-in-production]]", "[[mobile-layout-is-additive-to-the-legacy-look]]"]
---

# Parity with legacy is functional, not visual

> ## ⚠️ SUPERSEDED 2026-10-07 — the VISUAL-FREEDOM half only
>
> **Withdrawn:** *"and may be organised, laid out and styled however it does the job better. It does
> **not** have to look like the legacy app."*
>
> **Replaced by** [[parity-reinstates-the-legacy-look-with-defect-fixes]]: the owner asked for the
> legacy **look** to be reinstated on 2026-10-07, with legacy defects fixed rather than copied. The
> housekeeping that made "freedom" attractive (not shipping `BOX_SIZE_QTY` headers or `<th>`-less
> tables) survives as an explicit **defect-fix carve-out** in the new decision.
>
> **Still in force from this decision:** the **capability-inventory test** — parity is "every legacy
> capability has a home", counted rather than felt — and this note's measured evidence of *why* the
> naive copy failed, which is what produced the carve-out. The rest of this note is kept as written.

## Decision

**Supersedes the visual half of [[guest-ui-is-a-direct-shift-of-legacy]] (2026-09-27).**

The guest frontend ([[runtime-js-guest-platform]]) must be able to do **everything the legacy app
([[frontend]]) let a user do** — and may be organised, laid out and styled however it does the job
better. It does **not** have to look like the legacy app. Where the guest can be better than the
legacy screen it replaces, it should be, and the difference should be recorded rather than reverted.

Two things from the old decision **survive**, because they were never about looks:

- **one screen for one screen** — every capability has a home, and the coverage is countable;
- **the parity test must be decidable by evidence, not by taste** — which is why the old mandate chose
  a captured reference. The new test is a **capability inventory** instead of a screenshot.

## Why the visual mandate was withdrawn

Not on taste. Three concrete things it caused, all measured on 2026-10-05.

**1. It was copying defects.** The live legacy app was captured and compared
([[ui-parity-discrepancies-2026-10-05]]). Under a faithful-copy mandate these would have been
"correct":

| legacy behaviour | what faithfulness would mean |
|---|---|
| Stock Report headers read `COMPANY  NAME  CP  QTY  BOX_SIZE_QTY  STOCK_AMOUNT` — raw snake_case SQL column names, abbreviated | put `box_size_qty` on a shop screen |
| report tables have **no `<th>` at all** (the header row is `<td>`s) | ship a table that tells a screen reader nothing |
| the management action header is truncated to `Row acti…` | ship the truncation |
| the rail carries six icons, two of which are never used together with the rest | keep them |

**2. It blocked the improvements that were actually asked for.** A proper searchable autocomplete, and a
rail with fewer buttons, are *impossible* under a byte-faithful mandate — legacy has a specific
select-plus-box control and a nine-item rail, so both requests are refusals of the old rule rather than
work against it. An operator asking for a better control was asking to be told the mandate forbids it.

**3. It directed the work at the wrong half.** The whole of the 2026-10-05 parity pass was pixel
difference work. The parity tool's own output said so: *"a difference here is a candidate, not a
verdict"*, and the captures could not even tell whether a legacy screen had finished loading. Two of the
ten fixes were worth making — the Profit and Item Sales reports were printing the invoice number as a
float (`1.0`), and the report period had never rendered at all — but they were found by accident, while
looking at pictures.

## What replaces it as the test

**A capability inventory, one row per thing a user can do.** For each legacy screen: the actions, the
fields, the filters, the columns and the states it offers. The guest passes when each capability has an
equivalent — not when it looks the same.

- Coverage is counted, so "done" is a number rather than an impression.
- Visual differences are **recorded, not fixed**. [[ui-parity-discrepancies-2026-10-05]] becomes
  evidence and a record of accepted differences, not a work list.
- [[legacy-ui-reference-captures]] stays, re-read: the captures are now a **capability** reference —
  what the legacy screens could do — and no longer a pixel target.

## Consequences

- **The ten fixes committed on 2026-10-05 stand.** They were mostly layout, but two were real defects
  (the float invoice number, the never-rendered period) and the hub-tile layout and the report filter
  block are better than what they replaced.
- **The nine "still discrepant" items (A–I) in [[ui-parity-discrepancies-2026-10-05]] are re-triaged.**
  Only the ones that are *capability* differences remain open; the pixel-only ones are closed as
  accepted differences. The triage is in [[tb-0023-guest-feature-parity]].
- [[tb-0023-guest-feature-parity]] is **renamed** to [[tb-0023-guest-feature-parity]]. The
  slug asserted the withdrawn mandate, and a slug is read as a claim.
- [[mobile-layout-is-additive-to-the-legacy-look]] needs re-reading: its rule (mobile is additive, never
  a separate app) survives, but "to the legacy look" no longer names a target.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep the visual mandate, add improvements on top | Two rules in conflict; the mandate wins every argument, which is what happened for a week |
| Visual parity where it is cheap, freedom where it is not | Needs a judgement call on every screen, so it is not decidable and the judgement varies by author |
| No mandate at all | The cutover still needs a completeness test; capability parity is the one that measures the thing that matters |

## Related

- [[guest-ui-is-a-direct-shift-of-legacy]] — the withdrawn decision, kept on record.
- [[tb-0023-guest-feature-parity]] — the work item, retargeted.
- [[guest-frontend-feature-parity-gaps]] — the gap list, now the central document.
