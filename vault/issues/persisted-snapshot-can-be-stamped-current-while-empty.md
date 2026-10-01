---
title: The persisted snapshot can be stamped current while holding empty views, and ?full=1 cannot recover
type: issue
status: open
severity: high
created: 2026-09-28
updated: 2026-09-28
tags: [trailbase, reports, snapshot, mview, cache, defect]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[snapshot-persistence-hits-the-20s-deadline]]", "[[guest-fingerprint-refresh]]", "[[trailbase-incremental-report-refresh]]", "[[guest-report-result-cache]]"]
---


## REPRODUCED LIVE 2026-10-01 - still true, and `?full=1` still does not recover it

The condition does not exist in the current depot: all 14 persisted views are populated (the largest,
`paymentsInvoicesReport`, is 33,129 rows). But the **mechanism is still in the code and still
unrecoverable**, and it was reproduced deliberately.

`persistViews` writes whatever `state.views` holds and then stamps the fingerprint, with **no guard**
on an empty view. So an empty build is persisted as current, and the recovery path does not work:

1. seven views were set to `[]` with the fingerprint left current - the reported state;
2. `POST /reports/refresh?full=1` - which calls `invalidate()` and is supposed to rebuild everything;
3. the views were **still `[]` afterwards**, and `/reports/status` reported
   `lastRefresh: { hydrated: true, rebuilt: [] }`.

`invalidate()` clears the in-memory state, but `refresh` then **hydrates from the still-empty
persisted snapshot**, the fingerprint matches, so it decides it is current and rebuilds nothing. The
only recovery is to delete the `mview` rows. That is the exact failure the note described, and it is
a live defect in the recovery path, not a stale observation.

### The blast radius is now much smaller than it was

This is the part that has changed, and it matters. When the note was written, every report read the
materialised views. Reports are now **SQL over the base tables** ([[one-manifest-is-the-page-definition]]),
so with seven views poisoned:

- `/reports/payments` still returned 26,099 rows and a correct `Payable Amount` of 6,950,631.20;
- every reference-driven filter still populated - 944 parties, 60 areas, 9 sections, 5 bookers.

So the snapshot is now largely **vestigial for reads**, and the condition is a latent trap rather
than an active wrong-answer generator. It still deserves fixing: a guard on `persistViews` that
refuses to stamp a fingerprint over an empty view, and a `full` refresh that rebuilds instead of
hydrating.

The depot was restored from a backup afterwards and re-verified healthy.

# The persisted snapshot can be stamped current while holding empty views, and `?full=1` cannot recover

## Finding

After importing 60,245 records into a fresh depot, **every report rendered "No data"** while the
guest demonstrably had the data — `GET /count/payments` returned `Got 26526 rows`, and the base
tables held 26,526 / 23,413 / 8,927 rows.

The cause is that the persisted snapshot is **stamped with the fingerprint of the whole database,
but the views inside it can be empty**, and once that happens the fingerprint genuinely matches, so
the refresh machinery believes it is current forever.

```text
mview table contents after the bad build:

  transactionView          -> str 2      ("[]")
  invoiceView              -> str 2      ("[]")
  transactionsReport       -> str 2      ("[]")
  paymentsView             -> str 2      ("[]")
  paymentsInvoicesReport   -> str 2      ("[]")
  itemsReport              -> str 2      ("[]")
  itemsDifferenceReport    -> str 2      ("[]")
  ledgerJournal/Booker/Party/Area -> str 2
  outstanding              -> str 2
  refs                     -> str 1353
  counts                   -> str 202

mview_meta.fingerprint = {"payments":"26526:2026-09-28 17:26:20.771Z",
                          "invoices":"8927:...", "transactions":"23413:...", ...}   <- fully populated
```

So the cache says "I am current" and simultaneously holds nothing.

## The two defects

**1. `persistViews()` stamps a global fingerprint onto a partial build.**
`app/lib/reports.js:278-285` persists `state.views` with `currentFingerprint()` — the fingerprint of
*all 17 tables* — even when the build only read a subset of them, or when the build produced empty
views. Nothing records *which* views a fingerprint covers, so a later, correct, full read is
impossible to distinguish from a bad partial one.

**2. `?full=1` cannot force a rebuild, so there is no recovery through the API.**
`invalidate()` (`app/lib/reports.js:293-299`) drops only the **in-memory** state; it never touches
the persisted `mview` table. Immediately after, `refresh()` hits its early-adopt path
(`app/lib/reports.js:313-332`), which sees `state.built.length === 0` and a persisted fingerprint
that **does** match live, and re-hydrates the same empty snapshot. Observed result:

```json
{"lastRefresh":{"changed":[],"hydrated":true,"rebuilt":[]}, "rows":0, "views":14, "cachedReports":10}
```

`changed: []`, `rebuilt: []`, `rows: 0` — a "full" refresh that did no work at all, in 59 ms.

## Why it matters

This is the opposite of the intended behaviour of the invalidation path, and it is silent: the
reports render a valid, empty, correctly-styled page with `200`, so nothing looks broken. It
survives a server restart, because the persisted snapshot is in the database. It is very easy to
reach, because any load that builds a subset of views writes a global fingerprint.

## Recovery (what actually worked)

Neither `?full=1` nor a restart recovers it. The snapshot has to be cleared out of band:

```python
import sqlite3
c = sqlite3.connect("trailbase/traildepot/data/main.db")
for t in ("mview", "mview_meta", "pagecache"):
    c.execute(f'DELETE FROM "{t}"')
c.commit()
```

then restart the server and rebuild. There is no endpoint that does this, and there should be.

## Suggested fix

- Have `invalidate()` also delete the persisted rows, so a full invalidation genuinely means a full
  rebuild. This alone closes the recovery hole.
- Record the **set of views** a persisted fingerprint covers, not just the fingerprint, and refuse to
  early-adopt a snapshot that does not cover the views the caller needs.
- Consider stamping a per-view fingerprint, so a bad partial build cannot masquerade as current.

## Evidence

- `trailbase/runtime/app/lib/reports.js:278-285` — `persistViews(await currentFingerprint())`.
- `trailbase/runtime/app/lib/reports.js:293-299` — `invalidate()` clears memory only.
- `trailbase/runtime/app/lib/reports.js:313-332` — the early-adopt path in `refresh()`.
- `GET /count/payments` → `Got 26526 rows`, against reports rendering "No data".
- `POST /reports/refresh?full=1` with `Accept: application/json` → `{"changed":[],"hydrated":true,"rebuilt":[]}`.

## Related

- [[guest-fingerprint-refresh]] — the mechanism this defect lives inside.
- [[trailbase-incremental-report-refresh]] — the incremental behaviour it silently defeats.
