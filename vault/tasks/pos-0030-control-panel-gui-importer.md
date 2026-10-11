---
title: "Native Go the importer: control panel with monitor tab"
type: task
status: done
priority: medium
created: 2026-10-10
updated: 2026-10-10
tags: [migration, import, trailbase, pocketbase, go, gui, go-gui, monitor, control-panel, done]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[control-panel]]", "[[control-panel-gui-is-pure-go]]", "[[v1-direct-import-tool]]", "[[tb-0035-direct-sqlite-v1-importer]]", "[[go-module-proxy-blocked]]"]
---

# Native Go importer: control panel with monitor tab

**Done and verified 2026-10-10.** The v1 import tool is recreated as a **Go GUI**
that doubles as a TrailBase startup control panel. Toolkit: **go-gui** (pure Go),
not Fyne — see [[control-panel-gui-is-pure-go]]. System reference: [[control-panel]].

## Why

The owner wanted (1) the direct-import tool as a native **Go** application, not a
Node TUI, and (2) it folded into a **startup control panel** for TrailBase with a
CPU/RAM monitor tab and an importer control/status tab. The requirement was that
it **match the actual source and destination databases** — [[v1-direct-import-tool]]
and the live schemas, not a stale copy.

## Work

- [x] `trailbase/controlpanel/` — Go module, go-gui window, two tabs
      (`TrailBase`, `Import`).
- [x] `internal/importer` — Go port of `import-v1-tui.mjs`: same plan, id
      preservation, enums, 2 dp amounts, link tables, `invoice_maker`
      attribution, `--wipe` + `Difference` re-seed, verification.
- [x] Schema-aware `Open`: reads the real source and destination table/column
      lists and **refuses to run** on a destination missing a written column.
- [x] Registers `is_uuid_v7`/`uuid_v7`/`is_uuid`/`uuid_v4` on the SQLite
      connection (the destination's CHECK/DEFAULT need them).
- [x] `internal/monitor` — start / stop / attach `trail`, mirror `runtime\` +
      `migrations\`, ring-buffer console, gopsutil CPU/RAM sampling.
- [x] `--cli` headless mode, `--screenshot` headless render, `--tab` selector.
- [x] Verified against the **real** databases (see below).

## Evidence (real source + throw-away depot, 2026-10-10)

Source `legacyforparity/backend/pb_data/data.db`; destination a depot built from
the real `trailbase/migrations/main/`.

- Dry-run read counts == source: `parties` 1129 (13 links), `order_bookers` 4
  (5 links), `items` 235, `expenses` 88, `invoices` 12791,
  `invoices_return_reference` 62, `transactions` 34393, `payments` 32782.
- `--wipe` full import: **all 11 collections verify, 0 failures, 575 s**.
- Independent diff source↔dest: counts equal (only the seeded `Difference` party
  extra); money sums equal at **whole paisas**; `created`/`updated` min/max
  **byte-identical**; `invoice_maker` on 12,791/12,791; all
  `transactions.invoice`/`payments.invoice` resolved; `inv_doc` 12,791.
- Headless renders of both tabs succeeded (`--screenshot`, `--tab import`).

## Note on speed

575 s for ~106k rows (~185 rec/s) on a fresh WAL — slower than the Node tool's
31 s *on a page-cached copy*, and in line with its ~179 s live run, because every
invoice/transaction/payment insert fires the `inv_doc` document-sync triggers.

## Not done

- No vaulter-lite `documents` / job-queue import (same as the Node tool).
- Full interactive click-through of the live controls is still a manual check.

## Post-review hardening (2026-10-11)

A code review of the uncommitted changes found four safety/correctness defects in this package; all
were fixed and the module builds and vets clean (`go build ./...`, `go vet ./...`, exit 0):

- **`importer.go` `sameFile`** — `Open` compared `Source == Dest` as raw strings, which a case
  difference, relative spelling or `..` segment bypasses, so `--wipe` could empty the file it then
  reads (total, silent data loss). Now compares `os.SameFile` on the opened paths, falling back to
  cleaned absolute paths (case-folded on Windows).
- **`run.go` wipe backup** — `wipe()` runs per-table `DELETE` in autocommit with no rollback; a crash
  or `Stop()` mid-run left the depot wiped and half-loaded. `backupDest()` now copies `main.db` to a
  timestamped `.pre-import-<ts>.bak` before the wipe.
- **`run.go` progress accounting** — a failed row bumped `read`, and the batch-end bump added
  `len(batch)-created` more, so `Read`/`Done` double-counted failures and stayed 0 on a clean batch
  (the progress bar/speed never advanced). The batch-end bump now adds `len(batch)` once.
- **`monitor.go` `addrInUse`** — `waitForListen` succeeded on *any* TCP accept, so a `trail` that
  failed to bind (address already held) was reported as a healthy start. `Start` now fails fast when
  the address is already in use.
- **`main.go`** hard-codes the depot admin password `administrator-0ne` (finding 7, left as-is:
  it is the documented dev default and only applies to a fresh depot).
