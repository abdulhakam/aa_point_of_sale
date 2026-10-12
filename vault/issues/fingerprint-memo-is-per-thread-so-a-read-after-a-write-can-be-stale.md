---
$schema: "./issues.schema.json"
title: The data fingerprint is memoised per runtime thread, so a read after a write can be stale
type: issue
status: fixed
severity: medium
created: 2026-10-05
updated: 2026-10-05
tags: [trailbase, guest, cache, freshness, concurrency, reports]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[quick-create-rides-in-the-form-that-needed-it]]", "[[component-split-and-sql-materialised-tables]]", "[[reports-and-ledgers]]"]
---

# The data fingerprint is memoised per runtime thread, so a read after a write can be stale

**Fixed 2026-10-05.** Kept because the mechanism is not obvious from either file and the symptom looks
like something else entirely.

## Symptom

`tools/guest-smoke.mjs` intermittently failed checks that read a page **immediately after writing to
it**, with no code change between runs:

```
FAIL  ...and the new party is the invoice's party  — 200
FAIL  ...and the item's own price is what the select carries
```

The invoice page had been fetched successfully (200) and simply did not contain the party that had
just been created in the same request cycle — nor the item created a moment before. Roughly one run in
five. Re-running the identical harness passed 91/91.

## Mechanism

Three facts, each of which is correct on its own:

1. `app/lib/reports.js` memoises the data fingerprint for 1.5 s in module-level state (`probe`), because
   a probe is `COUNT(*)` + `MAX(updated)` across seventeen tables and one request must not repeat it.
2. TrailBase serves the guest on **several runtime threads** (`--runtime-threads=4` here), each with its
   own module state.
3. `invalidate()` — called from `routeKit.write()` for every mutation — cleared `probe` and the `base`
   read-cache, but only **in the thread that took the write**.

So a read that landed on a *different* thread used that thread's own memo, up to 1.5 s old, and
everything keyed on it with it:

- `refs()` — the reference snapshot rebuilds only when the fingerprint moves
  (`refsModule.refs(await fingerprint())`), so a party created a moment ago was absent from the
  dropdown the page had just rendered. That is the two failing checks.
- `dataVersion()` / `fingerprint()` — the host's rendered-page cache keys on them, so the whole page
  could be served from the pre-write render.

The write itself was never at fault: `data-digest` showed the rows committed. The bug was purely in
the freshness signal.

## Fix

The stamp half of the memo lives in the **shared TrailBase KV store** — the one channel every runtime
thread agrees on, already used for the sql/render handoff and the report spool:

- `invalidate()` writes a fresh unique stamp (`aa:data-stamp`) after clearing its own memo. It is
  **awaited**, including from `routeKit.write()`, so the stamp is committed before the mutation's
  response is; otherwise the browser's redirect GET can win the race to be stale.
- `currentFingerprint()` reads the stamp (one single-row KV read) and re-probes at once when it is not
  the value it probed at. The 1.5 s TTL remains as the floor, because a writer outside this app — the
  record API, a seeding script — cannot bump the stamp.

Degradation is deliberate: if the KV is missing or the write fails, this is exactly the old behaviour
(TTL-only), never a failed mutation.

## What was NOT the cause, and cost time

- **The harness matching the wrong thing.** One earlier failure (`a purchase's new party is a
  supplier — name x2, 5 edit links`) was a real harness bug: matching a row by name alone picked up the
  **company** of the same name in the create form's select. Fixed by requiring the row's own edit link.
  Worth separating, because it *looked* like the same symptom.
- **The route-coverage probe's 500s.** A separate run showed `component responded unexpectedly` on three
  routes; the host log shows a Rust panic from a **client** connection reset (`Kind(ConnectionReset)`)
  while the component was writing a body, which is the harness's own aggressive probing. The immediate
  re-run was 77/77 with the depot clean. Not this issue.

## Verification

- 5 consecutive `guest-smoke.mjs` runs at 91/91 after the fix (the failure had appeared in ~1 of 5 before).
- Read-path latency unchanged with the extra KV read: invoices list median 329 ms, payments report
  median 89 ms, invoice entry median 48 ms.
- `hotkey-check` 62/62, `autocomplete-check` 39/39, `route-snapshot` 49/0, `route-coverage` 77/77.
- `db-digest`: 60,245 → 60,246, the known seeded `Difference` party only, every money column equal.

## Remaining, honestly

- A write **outside** the app (record API, script) is still visible only within the 1.5 s TTL. That is
  the documented behaviour of the memo, not a regression.
- A 1.5 s staleness window on reads that do not go through `routeKit.write()` at all is unchanged.
- ⚠️ The failure was intermittent and the fix was verified by repetition, not by a deterministic test.
  A regression would show as this same flaky shape. If it reappears, check the stamp path first:
  `globalThis.kv` present, `aa:data-stamp` moving after a write.

## Evidence

- `trailbase/runtime/ahscripts/lib/reports.js` — `probe`, `kvStamp()`, `currentFingerprint()`, `invalidate()`.
- `trailbase/runtime/ahscripts/lib/route-kit.js` — `write()` awaits `invalidate()`.
- `trailbase/runtime/ahscripts/lib/refs.js` — the snapshot keyed on the fingerprint.
- `trailbase/runtime/ahscripts/lib/invoice-doc.js:51,60` — the KV idiom this follows.

## Related

- `reports.no_precomputation` — freshness is a requirement here, not a nicety; this was a hole in it.
- [[quick-create-rides-in-the-form-that-needed-it]] — the feature whose harness exposed it.
- [[component-split-and-sql-materialised-tables]] — the other half of the freshness story: what stays
  fresh by construction, versus what has to be signalled.
