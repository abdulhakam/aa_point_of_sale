---
title: The guest frontend is a direct shift of the legacy UI, not a redesign
type: decision
status: superseded
decided_on: 2026-09-27
created: 2026-09-27
updated: 2026-10-05
superseded_by: "[[parity-is-functional-not-visual]]"
tags: [frontend, guest, wasm, parity, ui, cutover, legacy, superseded]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[parity-is-functional-not-visual]]", "[[runtime-js-guest-platform]]", "[[frontend]]", "[[guest-frontend-feature-parity-gaps]]", "[[tb-0023-guest-feature-parity]]", "[[mobile-layout-is-additive-to-the-legacy-look]]", "[[tb-0028-guest-transactional-screens-and-mobile]]"]
---

# The guest frontend is a direct shift of the legacy UI, not a redesign

> ## ⚠️ SUPERSEDED 2026-10-05 — the VISUAL half only
>
> **Withdrawn:** *"one screen for one screen, **with the same look** … same layout, same labels, same
> tiles, same print output"*, and with it the captured legacy UI as a **pixel** reference.
>
> **Replaced by** [[parity-is-functional-not-visual]]: parity is **functional**. The guest must be able
> to do everything the legacy app could do and may be laid out and styled however it does the job
> better.
>
> **Still in force from this decision:** one screen for one screen (every capability has a home, and
> coverage is countable); the parity test must be decidable by evidence rather than taste — which is why
> the new test is a **capability inventory** rather than a screenshot; and the guest must reproduce the
> legacy printout header, which is a business identity, not a look
> ([[environment]]).
>
 > The rest of this note is kept **as it was written on 2026-09-27**, because a withdrawn claim that has
> been deleted is indistinguishable from a claim that was never made — and this one was acted on for
> eight days. What it caused is recorded in [[parity-is-functional-not-visual]] and measured in
> [[ui-parity-discrepancies-2026-10-05]].
>
> ## ⚠️ Partly reinstated 2026-10-07
>
> The **look half of this decision is back**, in modified form: parity reinstates the legacy look but
> **fixes legacy defects rather than copying them** — [[parity-reinstates-the-legacy-look-with-defect-fixes]].
> The byte-faithful clause ("same look … same labels, same tiles, same print output") remains
> withdrawn; `BOX_SIZE_QTY`-style headers and `<th>`-less tables are still not copied.

## Decision (as written 2026-09-27)

The guest-WASM frontend ([[runtime-js-guest-platform]]) replaces the legacy Next.js app
([[frontend]]) **one screen for one screen, with the same look**. It is a re-platform of the
existing product, not a redesign: same layout, same labels, same tiles, same print output.
New-side screens that had no legacy counterpart keep their own look only where there is nothing
to match.

The captured legacy UI is the reference for this work
([[legacy-ui-reference-captures]]).

## Why

- The legacy Next.js UI is what staff know and what the business runs on; a look-and-feel
  change would add retraining to a migration that is supposed to be invisible
  ([[keep-legacy-stack-in-production]]).
- The parity target is behavioural *and* visual, so the cutover can be judged screen by screen
  against a captured reference rather than by taste.
- It fixes the "two business identities" drift in the same pass: the guest must reproduce the
  legacy printout header (`SAMPLE TRADERS` + address + phone), not the old `APP_NAME`
  placeholder ([[environment]]).

## Consequences

- The intermediate JS experiment, `frontend-ssr`, is **removed**: the Node/Express app and its
  vault documents are gone. The runtime-JS work proved the model (minijinja render, shared
  `compute/`, declarative pages, jobs, fingerprint refresh); the Rust guest is now the host.
- Still-valid decisions taken during that experiment are kept but **retargeted to the guest**:
  where the code lived under `frontend-ssr/` it now lives under `trailbase/runtime/app/`.
- The guest's current screens must be restyled to match legacy, and the missing transactional
  screens must be built ([[guest-frontend-feature-parity-gaps]],
  [[tb-0023-guest-feature-parity]]).
- The Node `frontend-ssr/plugins/import-from-v1/` copy of the data-migration tool was removed
  with the directory. A ported copy already exists on the guest at
  `trailbase/runtime/app/plugins/import-from-v1/`; verifying it is
  [[pos-0029-rebuild-v1-import-on-guest]].

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep `frontend-ssr` as the reference implementation | It is a Node process and a second runtime/deploy; the platform goal is one binary, one depot, offline ([[trailbase-guest-wasm-runtime-defaults]]). Keeping it as "reference" keeps two frontends to maintain. |
| Redesign while porting | Adds retraining and makes parity unverifiable; the mandate is the same product. |
| Archive `frontend-ssr` read-only | Its code paths would still be cited as evidence in a vault whose frontend is the guest; the tree is the source of truth and the guest's `app/` is self-contained now. |

## Evidence

- `frontend-ssr/` was deleted from the tree on 2026-09-27 (88 tracked files).
- The guest is self-contained: `trailbase/runtime/app/compute/*.js` carries the shared arithmetic,
  `trailbase/runtime/app/lib/*` the ported modules, and the Node-only id helper now lives at
  `trailbase/tools/uuid.mjs`.
- The Node-comparative harnesses (`trailbase/tools/guest-parity.mjs`, `perf-compare.mjs`) were
  deleted with the Node app; the guest's standalone checks (`guest-smoke.mjs`,
  `management-check.mjs`, `invoice-check.mjs`, `jobs-check.mjs`, `view-equivalence.mjs` — deleted
  2026-10-02 with the legacy view layer) remain.
- [[guest-app-host-port]] records the parity results that justified dropping the Node reference.

## Related

- [[guest-frontend-feature-parity-gaps]] — what is still missing.
- [[tb-0023-guest-feature-parity]] — the work item.
- [[legacy-ui-reference-captures]] — the captured legacy UI.
- [[runtime-js-guest-platform]] — the system that now carries the frontend.
