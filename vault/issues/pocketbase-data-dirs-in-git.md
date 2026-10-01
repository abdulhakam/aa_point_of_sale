---
title: A live PocketBase data directory is committed to git
type: issue
status: resolved
severity: high
created: 2026-09-26
tags: [git, pocketbase, hygiene, secrets, backend]
related_to: ["[[backend]]", "[[build-and-run]]"]
---


## RESOLVED 2026-10-01

The user deleted the PocketBase data directories from this branch; there is no PocketBase on it
anymore. Nothing to commit, and the risk is gone rather than mitigated.

# A live PocketBase data directory is committed to git

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
