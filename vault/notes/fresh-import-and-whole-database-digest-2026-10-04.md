---
title: Fresh import and whole-database digest, 2026-10-04
type: note
status: active
created: 2026-10-04
updated: 2026-10-04
tags: [pos, import, migration, data-integrity, money, digest, pocketbase, trailbase]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[report-cost-on-a-whole-database]]", "[[pos-0027-migrate-production-data-to-trailbase]]", "[[money-is-2dp-everywhere]]", "[[import-from-v1-drops-invoice-maker]]", "[[guest-depot-created-is-import-time]]", "[[reports-parity-and-e2e-2026-09-29]]"]
---

# Fresh import and whole-database digest, 2026-10-04

The depot was **rebuilt from scratch and re-imported**, and the result checked against the legacy
database with a new harness. This note is the fresh-import evidence, and it carries a **correction to
an earlier parity claim** that turns out to have been verified against an empty file.

## Which legacy database is live

`legacyforparity/RUN MINI.BAT` runs `pocketbase.exe serve` with no `--dir`, so PocketBase serves
**`legacyforparity/backend/pb_data/`** — 17,960,960 bytes, and its `data.db-shm` timestamp moves when
the server starts. That is the oracle to compare against.

⚠️ **The working-tree `p_data/data.db` is an empty stub, and several notes still name it.** It is
745,472 bytes and every business table in it is empty:

```text
p_data:  areas=0 categories=0 expenses=0 invoices=0 items=0 order_bookers=0 parties=0
         payments=0 sections=0 transactions=0   (users=1)
```

**This is NOT a claim that the 2026-09-29 parity check was vacuous.** My first version of this note
said exactly that, on the strength of the working-tree file, and it was wrong — the check was made
against a database that had the data in it. What git history holds proves it:

```text
git cat-file -s c167d311^:backend/p_data/data.db   ->   11,182,080
```

That blob, extracted and censused today, is the **full dataset** — 8,927 invoices, 26,526 payments,
23,413 transactions, 942 parties, 207 items — i.e. identical in every row count to the live `pb_data`,
and it agrees with the fresh import on **every** money column at whole paisas (table below). So the
2026-09-29 claim stands.

**The live hazard is the path, not the claim.** Anything that names
`legacyforparity/backend/p_data/data.db` today reads an empty database, and **a parity check against
an empty reference passes**. That is a real trap for every tool and note that still uses the path,
including `pocketbase-data-dirs-in-git.md`, which recorded "whether `p_data/data.db` or
`pb_data/data.db` held real business data is still unestablished" — now settled, in the note that
already existed:

| path | bytes | business rows |
|---|---|---|
| `legacyforparity/backend/p_data/data.db` (working tree) | 745,472 | **none** |
| `backend/p_data/data.db` at `c167d311^` (git blob) | 11,182,080 | the full dataset |
| `legacyforparity/backend/pb_data/data.db` (served) | 17,960,960 | the full dataset |

**Use `pb_data` (or the extracted git blob) as the oracle. `p_data` in the working tree is a trap that
cannot fail.** This is [[settle-structural-claims-with-the-owning-artifact]] with the roles reversed:
there, a proxy was read as absence; here, an empty file is what a real check would be compared against
unless the path is right.

## The import

Rebuilt with `clear_db.bat` + `build.bat` + `RUN.BAT` (the depot's previous contents were copied to
`trailbase/traildepot/backup-20261004-212325/` first). Then the plugin's own code, headless:

```text
node trailbase/tools/import-from-v1.mjs --no-auth
```

```text
collection                      read  created  failed  links
sections                          10       10       0      0
categories                        15       15       0      0
areas                             59       59       0      0
parties                          942      942       0     13
order_bookers                      4        4       0      5
items                            207      207       0      0
expenses                          88       88       0      0
invoices                        8,927    8,927       0      0
invoices_return_reference         54       54       0      0
transactions                   23,413   23,413       0      0
payments                       26,526   26,526       0      0
TOTAL                         60,245   60,245       0

status=done  phase=finished  359.5s  (168 rec/s)
```

Read == created for every collection, 0 failures, and the link counts (13 parties, 5 bookers) and the
8,927 dropped `invoice_maker` references match the recorded reference exactly
([[import-from-v1-drops-invoice-maker]]).

### `--no-auth`, and why the superuser was not needed

Every collection the import needs is **world-readable** on this PocketBase (`rules: ""`), and the
import only ever *reads* from the source — `count()` and `iterate()` are its whole surface. So
`import-from-v1.mjs` and the plugin page gained an explicit no-token path, guarded by a probe that
refuses unless the server answers 200:

```text
--no-auth: the server serves records without a token; importing without logging in
```

Against a locked-down PocketBase it fails in a second with a message about the server's rules, rather
than at record 40,000 with a 403. This avoids storing a superuser password in order to obtain a token
that changes nothing — which also keeps `vault/credentials/` empty, as
[[build-and-run]] currently records it.

## The digest

New harness: `trailbase/tools/db-digest.mjs`. Per-table row counts and per-column money/quantity sums
for both databases, side by side. It is deliberately **not** a row-by-row comparison — ids are
deliberately re-mapped (PocketBase `'r…'` → UUIDv7), so a join on id is not available.

**Money is compared at whole paisas, per value, not on the raw float total**, and this is the second
correction. On the raw `sum(amount)` the comparison reports `payments` 48,581,949.77 against
48,581,949.78 — a one-paisa difference that reads as an import defect. It is not:

```text
legacy    sum(amount*100) = 4856433777.1   sum(round(amount*100)) = 4856433778
trailbase                                             4856433778
```

Legacy stores two payments with amounts **below a paisa** — `1551.375` (HUNAIN G/S, 2026-02-14) and
`3987.696` (MEEZAB MART, 2026-03-26) — and the new schema rounds every money write to 2 dp
([[money-is-2dp-everywhere]]), giving `1551.38` and `3987.70`. So the two stores **agree once each
value is rounded**, and the raw difference was float accumulation in `sum()`, not data. Comparing
money by summing raw floats asks a question about floating point and answers it as if it were about the
data.

Result, whole-paisa comparison, `--verbose`. Run twice — once against the live `pb_data`, once against
the **extracted git-history `p_data` blob** — and **both are identical**, which is the cross-check that
the oracle chosen is the oracle intended:

| legacy table | trailbase table | rows | Σ money legacy | Σ money trailbase | verdict |
|---|---|---|---|---|---|
| areas | areas | 59 → 59 | 0 | 0 | ok |
| categories | companies | 15 → 15 | 0 | 0 | ok |
| expenses | expenses | 88 → 88 | 2,738,113 | 2,738,113 | ok |
| invoices | invoices | 8,927 → 8,927 | 51,521.50 | 51,521.50 | ok |
| invoices_return_reference | (same) | 54 → 54 | 0 | 0 | ok |
| items | items | 207 → 207 | 128,026.13 | 128,026.13 | ok |
| order_bookers | order_bookers | 4 → 4 | 0 | 0 | ok |
| **parties** | parties | **942 → 943** | 0 | 0 | **ROWS** |
| payments | payments | 26,526 → 26,526 | 48,581,949.78 | 48,581,949.78 | ok |
| sections | sections | 10 → 10 | 0 | 0 | ok |
| transactions | transactions | 23,413 → 23,413 | 9,956,274.36 | 9,956,274.36 | ok |
| **TOTAL** | | 60,245 → **60,246** | | | |

Per-column, all equal: `payments.amount`, `transactions.price`, `transactions.qty`,
`transactions.cost_price`, `transactions.discount_rs`, `expenses.amount`, `items.cost_price`.

### The one row difference is by design

`parties` is 943 rather than 942, and the extra row is:

```text
name='Difference'  type=0  created='2026-09-29 00:00:00.000Z'
```

The **Difference counterparty**, seeded idempotently by name by
`migrations/main/U1790400000__invoice_lifecycle_and_difference_party.sql:74`. It exists because a
stock difference is an invoice to a party named "Difference", and without it a difference cannot be
entered at all. So 60,246 is the correct total for a fresh depot, and **60,245 vs 60,246 is the
expected difference, not a drift**.

## The previous depot was not a clean import

Before the rebuild, `db-digest.mjs` was run against the 2026-10-03 depot for comparison. It was
**not** a pristine import:

| table | legacy | 2026-10-03 depot | |
|---|---|---|---|
| invoices | 8,927 | 8,930 | +3 |
| parties | 942 | 943 | +1 (the seeded one) |
| transactions | 23,413 | 23,415 | +2 |
| payments.amount | 48,581,949.77 | 48,581,949.78 | +1 paisa (the rounding above) |

So the old depot carried **five rows that were not in the oracle** — residue from harness runs whose
own cleanup did not complete. Nothing was lost (the fresh import has every one of the oracle's rows),
but it means **a digest against the old depot could not have detected a missing row**, because the
expected count was already wrong. That is the argument for running `db-digest.mjs` after every import
rather than trusting the import's own summary.

## Also fixed on the way

`/jobs/reconcile` read `snap.built.length` from a service that no longer has a `built` — a leftover
from [[tb-0032-manifest-first-refactor]] phase 3, which retired the view snapshot. It threw a
TypeError on every reconcile, the catch swallowed it, and `materialized` was therefore **always** null:
a route that logged an error every minute and reported that it had done nothing. Found by reading the
server log during the report sweep, not by a failing check. Now:

```text
POST /jobs/reconcile -> {"materialized":{"changed":0,"rebuilt":0,"tables":16},"reconciled":0}
```

## Related

- [[report-cost-on-a-whole-database]] — what this imported database then had to answer.
- [[money-is-2dp-everywhere]] — why the two sub-paisa payments differ, and why that is correct.
- [[pocketbase-data-dirs-in-git]] — why there are two legacy data directories at all.