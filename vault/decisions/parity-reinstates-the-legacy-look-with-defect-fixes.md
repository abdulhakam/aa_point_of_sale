---
title: Parity reinstates the legacy look, with legacy defects fixed rather than copied
type: decision
status: accepted
decided_on: 2026-10-07
created: 2026-10-07
updated: 2026-10-07
tags: [frontend, guest, parity, ui, cutover, legacy, mandate, supersedes]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-is-functional-not-visual]]", "[[guest-ui-is-a-direct-shift-of-legacy]]", "[[tb-0023-guest-feature-parity]]", "[[guest-frontend-feature-parity-gaps]]", "[[legacy-ui-reference-captures]]", "[[ui-parity-discrepancies-2026-10-05]]", "[[screen-parity-against-the-legacy-bundle-2026-10-04]]", "[[runtime-js-guest-platform]]", "[[mobile-layout-is-additive-to-the-legacy-look]]"]
---

# Parity reinstates the legacy look, with legacy defects fixed rather than copied

## Decision

The guest frontend ([[runtime-js-guest-platform]]) must **look and behave the way the legacy app
([[frontend]]) looked and behaved for the user**, screen for screen — the visual half of the
direct-shift mandate is **back on**, and the intermediate SQL decision is untouched: report
arithmetic still runs in SQLite ([[report-numbers-come-from-sqlite]]).

This **supersedes the visual-freedom half of [[parity-is-functional-not-visual]]** (2026-10-05). It
reinstates the look half of [[guest-ui-is-a-direct-shift-of-legacy]] (2026-09-27) **minus that
decision's byte-faithful clause**.

Two things survive from [[parity-is-functional-not-visual]], because the owner did not withdraw them:

- **the capability-inventory test** — parity is still "every legacy capability has a home", counted
  rather than felt; and
- **the record of accepted differences** — [[ui-parity-discrepancies-2026-10-05]] stays as evidence.
  Its pixel-only items are now work again, not accepted differences.

## The defect-fix carve-out

"Looks the same" is **not** "reproduces the legacy's bugs". Where the legacy screen was visibly
wrong, the guest keeps the correction and the difference is recorded:

| legacy defect | guest keeps |
|---|---|
| report headers print raw `snake_case` SQL names (`BOX_SIZE_QTY`) | friendly labels (`Carton Size`) |
| report tables have **no `<th>` at all** | real `<th>` cells for assistive technology |
| the management action header is truncated to `Row acti…` | the full label |
| create is only reachable from the invoice screen | the searchable autocomplete and the create-from-the-invoice affordance stay |

Everything else — layout, labels, colours, tiles, dialogs, the filter modal, the printout header —
is matched to the legacy captured/live rendering, not reinterpreted.

## Why now

The owner asked for it directly on 2026-10-07: *"the new UI should look and behave EXACTLY the same
for the user"*, with the SQL calculation logic explicitly retained. The 2026-10-05 withdrawal was
correct on its own terms (a faithful copy was reproducing defects and refused requested
improvements), and the two are reconcilable: **match the look, fix the defects**. The carve-out above
is the reconciliation.

The legacy source no longer exists, so the reference is the **live frozen bundle**
(`legacyforparity/RUN MINI.BAT`, `:3000`) plus the captures in [[legacy-ui-reference-captures]];
[[ui-parity-discrepancies-2026-10-05]] records that the 2026-09-27 captures were validated as
faithful against the live app.

## Consequences

- The plan and sequence are `.kilo/plans/1791404570000-legacy-look-and-indexeddb-refs.md`; the work
  item is [[tb-0023-guest-feature-parity]], retargeted back to the visual mandate.
- [[parity-is-functional-not-visual]] is marked superseded for its look clause; kept on record, not
  deleted.
- [[mobile-layout-is-additive-to-the-legacy-look]]'s rule (mobile is additive, never a separate app)
  stands; it now has a named target again.
- The UI capture tools (`tools/ui-capture.mjs`, `tools/ui-parity-report.mjs`) become gates again, not
  merely records.
- The gate list for every restyle is: `ui-capture.mjs` diff + `guest-smoke.mjs` +
  `route-snapshot.mjs` + `verify-spool-reports.mjs`.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Byte-exact legacy copy | Reintroduces `BOX_SIZE_QTY` headers and `<th>`-less tables; the owner chose "fix defects" |
| Keep functional freedom | The owner explicitly asked for the legacy look |
| Exact look where cheap, freedom otherwise | Not decidable screen by screen; the same objection that retired the earlier mandate |

## Related

- [[parity-is-functional-not-visual]] — the withdrawn visual-freedom decision, kept on record.
- [[guest-ui-is-a-direct-shift-of-legacy]] — the original look mandate.
- [[tb-0023-guest-feature-parity]] — the work item, retargeted.
- [[ui-parity-discrepancies-2026-10-05]] — the measured differences, now a work list again.
