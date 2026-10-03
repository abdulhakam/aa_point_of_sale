---
title: The guest smoke count is not a hard-coded number
type: note
status: active
created: 2026-10-03
tags: [verification, harness, guest-smoke, documentation, process]
related_to: ["[[build-and-run]]", "[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]", "[[route-snapshot-was-snapshotting-redirects]]", "[[vault-guide]]"]
---

# The guest smoke count is not a hard-coded number

## The problem

`node trailbase/tools/guest-smoke.mjs` prints `N/N checks passed` **at runtime**. The number changes
whenever a check is added or removed. The vault, meanwhile, hard-coded it in **~40 documents**, and
those documents had drifted apart into six mutually contradictory numbers:

| Figure | Where it is asserted |
|---|---|
| `67/67`, `67/76` | `[[guest-fingerprint-refresh]]`, `[[browser-page-and-filter-sweep-2026-10-01]]`, `[[spooling-report-rows-through-kv]]`, `[[tb-0031-remove-proven-dead-code]]` |
| `68/76` | `[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]` |
| `69/69` | `[[vault-code-drift-audit]]` |
| `70/77`, `71/71` | most of the project and issue notes |
| `76/76` | `[[components-are-named-tb-ah]]`, `[[system-status-overview]]`, `[[guest-invoice-lifecycle]]`, `[[tb-0022-move-reports-to-sql]]`, `[[tb-0028-guest-transactional-screens-and-mobile]]` |
| `78/78` | `[[report-default-window-comes-from-the-data]]`, `[[reports-filter-on-created-not-the-business-date]]` |

Two of those are not counts at all — `67/67` and `69/69` are **different suites at different
denominators**, quoted with the same "smoke" label. `tb-0032-manifest-first-refactor.md` records
`71/78`, i.e. a run with 7 known failures, and calls it the baseline.

## The measured figure

**`78/78`, measured 2026-10-03** on a pristine checkout:

```text
== preparing throw-away TrailBase depot with the guest component ==
   seeded: {"invoices":4,"items":2,"parties":2}
PASS  anonymous /dashboard redirects to /login
...
PASS  logout redirects to TrailBase's auth endpoint

== 78/78 checks passed ==
```

The harness needs no running server and no credentials — it boots its own depot on `:4322` and
creates its own admin — which is why this figure is establishable at all while the production depot's
admin password is unknown.

## The rule

- **Never hard-code the current count in prose.** Write "see [[build-and-run]]" or "the guest smoke
  suite passes in full". A number in a document is a claim about a run, and the reader cannot tell
  which run.
- **A dated past measurement may keep its number.** "The suite passed 76/76 on 2026-09-30 with the
  same checkout" is a historical statement about a flaky set and is *correct as history*. Rewriting it
  to 78/78 would make it false. Those stay, with their date.
- **Where a count must appear, say where it came from:** "run `node trailbase/tools/guest-smoke.mjs`;
  it prints `N/N` at runtime."

## Why this matters beyond tidiness

A suite that is *also* flaky makes a hard-coded count actively misleading.
`[[guest-smoke-report-total-checks-fail-on-pristine-checkout]]` documents 8–10 checks failing on an
**unmodified checkout**, so `76/76` was never a reliable gate even when it was true. A document
asserting a green number is asserting something the harness does not guarantee.

This is the same shape as
`[[route-snapshot-was-snapshotting-redirects]]`: a verification tool whose output was read as a
result rather than as a claim to be checked. See
`[[settle-structural-claims-with-the-owning-artifact]]`.

## What was changed on 2026-10-03

Current-state claims were rewritten to point here. Dated historical claims were left alone. The
commit that fixed `route-snapshot.mjs` is the reason a real baseline could be taken at all — before
that fix, any authenticated route gate was reporting redirects.

## Related

- [[build-and-run]] — how to run every harness, and which need a server.
- [[guest-smoke-report-total-checks-fail-on-pristine-checkout]] — the flaky set that makes a
  hard-coded count worse than no count.