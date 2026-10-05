---
title: A live PocketBase data directory is committed to git
type: issue
status: open
severity: high
created: 2026-09-26
updated: 2026-10-03
tags: [git, pocketbase, hygiene, secrets, backend]
related_to: ["[[backend]]", "[[build-and-run]]", "[[cutover-is-guest-only]]"]
---


## RESOLVED 2026-10-01 — **REOPENED AND CORRECTED 2026-10-03, see below**

The user deleted the PocketBase data directories from this branch; there is no PocketBase on it
anymore. Nothing to commit, and the risk is gone rather than mitigated.

> ⚠️ **The banner above is wrong.** See *REOPENED 2026-10-03* below for the correction and the
> evidence. The short version: the data was not deleted, it was **moved** to `legacyforparity/`, and
> an 11,182,080-byte `p_data/data.db` blob is still in this repository's history.

# A live PocketBase data directory is committed to git

## REOPENED 2026-10-03 — the "RESOLVED 2026-10-01" banner was wrong

**What it claimed.** *"The user deleted the PocketBase data directories from this branch; there is no
PocketBase on it anymore. Nothing to commit, and the risk is gone rather than mitigated."*

**Why that was wrong, on all three counts.**

1. **The data is not gone — it moved.** `backend/` was deleted from git on 2026-09-29 (`c167d311`),
   and the directory is now `legacyforparity/backend/`. Both data directories are present on disk
   today:

   | Path | Present? | Size |
   |---|---|---|
   | `legacyforparity/backend/pb_data/data.db` | yes | 17,960,960 bytes |
   | `legacyforparity/backend/p_data/data.db` | yes | 745,472 bytes |
   | `legacyforparity/backend/p_data/logs.db` | yes | 40,960 bytes |

2. **"Nothing to commit" was never true of the history.** Untracking stops *new* commits; it does
   not remove existing blobs. `git cat-file -s c167d311^:backend/p_data/data.db` returns
   **`11182080`** — an 11,182,080-byte database, plus `logs.db`, `data.db-wal`, `data.db-shm` and
   `types.d.ts`, are still in this repository's history.

3. **The untracked surface got broader, not narrower.** `p_data/` was the one *tracked* directory.
   Since 2026-09-29 the **entire** legacy tree is git-ignored (`/legacyforparity/`), so `pb_data/` —
   the *larger* 18 MB database — is untracked too. The bytes moved from "in git" to "on one
   untracked disk folder".

4. **ANSWERED 2026-10-04 — which directory held the real data.** The question left open below is now
   settled, and the answer is **both, at different times**:

   | path | bytes | business rows |
   |---|---|---|
   | `legacyforparity/backend/pb_data/data.db` (working tree, **served today**) | 17,960,960 | the full dataset — 8,927 invoices, 26,526 payments, 23,413 transactions, 942 parties |
   | `legacyforparity/backend/p_data/data.db` (working tree, **today**) | 745,472 | **none** — every business table is empty |
   | `backend/p_data/data.db` at `c167d311^` (git blob) | 11,182,080 | the full dataset, identical in every row count to `pb_data` |

   So the working-tree `p_data/data.db` has been **replaced by an empty stub** since the 2026-09-29
   work, while the 11 MB blob in history still holds the data and agrees with `pb_data` on every money
   column. **`p_data` in the working tree is now a trap: any check that names that path compares
   against nothing and cannot fail.** Use `pb_data`, or extract the git blob
   (`git cat-file blob c167d311^:backend/p_data/data.db`). Several vault notes still name the stub
   path — grep `p_data` before trusting one. Full working:
   [[fresh-import-and-whole-database-digest-2026-10-04]].

### The risk that is actually open

- ⚠️ **The 11 MB `p_data/data.db` blob is still in git history.** Step 4 of *What to do* — purge from
   history — has never been done. That is a history rewrite on a repository with a remote, so it
   remains an owner decision rather than a drive-by commit.
- ⚠️ **The parity oracle depends on one unignored folder surviving.** `legacyforparity/` has no git
  copy. See [[cutover-is-guest-only]] — it is both the rollback artefact and the only copy of the
  legacy data.
- ✅ **Resolved 2026-10-04:** whether `p_data/data.db` or `pb_data/data.db` held real business data —
  both did; see point 4 above.
  `pb_data` is the larger of the two and the more likely candidate.

The original issue body below is unchanged.

## What is wrong

`backend/` contains **three** PocketBase data directories, and the root `.gitignore` only excludes
two of them:

| Path | Git status |
|---|---|
| `backend/pb_data/` | ignored (`/backend/pb_data` in the root `.gitignore`) |
| `backend/pb_data_bench/` | ignored (`/backend/pb_data_bench`) |
| `backend/p_data/` | ⚠️ **tracked** — no `.gitignore` entry covers it |

`git ls-files` confirms these are in the repository:

```text
backend/p_data/data.db
backend/p_data/data.db-shm
backend/p_data/data.db-wal
backend/p_data/logs.db
backend/p_data/types.d.ts
```

## Why it matters

1. **A database is in version control.** `data.db` is a binary that changes on every write, so
   every commit that touches it stores a whole new copy. `data.db-wal` and `data.db-shm` are
   SQLite's write-ahead log and shared-memory files — they are *supposed* to be transient and
   deleted on clean shutdown, and committing them means the repository can hold an unapplied WAL
   that a fresh checkout will replay.
2. **It can leak real data.** If `p_data/` was ever pointed at a real dataset, that dataset is in
   git history, and it contains whatever user rows, phone numbers and amounts it had.
3. **It undermines the "backup = copy the folder" story.** [[offline-local-deployment]] relies on
   the data directory being a simple file copy the application owns; here it is also repository
   content, so restoring is ambiguous.
4. **The name is the trap.** `p_data` differs by two characters from `pb_data`, so it is easy to
   pick the wrong directory when starting the server or when writing a `.gitignore` rule — which is
   most likely how this happened.

## What to do

1. Decide whether `backend/p_data/` is live. If it is not, delete it from the working tree and from
   history.
2. Add it to the root `.gitignore` regardless, so a future mistake is a no-op:
   ```gitignore
   /backend/p_data
   /backend/p_*/
   ```
   The glob form also catches `pb_data`, `pb_data_bench` and any future `p*_data` variant, which is
   the class-level fix for the naming trap.
3. Untrack without deleting locally:
   ```powershell
   git rm -r --cached backend/p_data
   ```
4. If the content might be real data, treat it as a secret: after untracking, purge it from history
   (`git filter-repo` or equivalent) rather than merely deleting it in a later commit, because the
   blobs remain in history.
5. Then reconcile the three directories into one — three data directories next to one binary is
   itself a source of confusion.

⚠️ Step 4 rewrites history and must not be done casually in a repository others have cloned. The
call belongs to the repository owner.

## Not done yet

Left as an issue rather than fixed: it is a history-affecting change on a production repository, so
it needs an explicit decision rather than a drive-by commit.

## Related

- [[backend]] — the three data directories in context.
- [[build-and-run]] — the data-directory table, which lists this as a known problem.
- [[system-status-overview]] — carried as an open risk.
