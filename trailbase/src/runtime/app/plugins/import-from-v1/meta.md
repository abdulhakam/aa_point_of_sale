---
title: Import from v1
description: Copy every record from a running PocketBase (v1) server into this TrailBase database.
author: Abdul Hakam
license: MIT
tags: [migration, pocketbase, import, one-time]
order: 10
---

# Import from v1

A one-time migration tool for moving an existing **PocketBase v1** database into
this TrailBase deployment. It runs entirely in the browser and needs no backend
code here: it signs in to PocketBase and TrailBase directly and copies the data
itself.

## What it does

- Reads every business record from PocketBase over its REST API and writes it to
  TrailBase through the record APIs, in dependency order (masters → link tables →
  invoices → return references → transactions → payments).
- Translates PocketBase ids to fresh TrailBase UUIDs and PocketBase enum text
  (`sale`, `customer`, `sending`, …) to the TrailBase integer codes.
- Maps the legacy **`categories`** collection — which the legacy frontend shows
  as **"Companies"**, and which `items.category`, `parties.company` and
  `order_bookers.company` all reference (legacy has no separate `companies`
  table) — into the new **`companies`** table. Because the new schema also keeps
  a distinct `categories` table (the FK target of `items.category` and the
  source of the item-company report column), each company is written to
  **both** tables from the one legacy row, so the item relation and the
  party/booker links both resolve.
- Expands the multi-valued `parties.company` / `order_bookers.company` relations
  into the `party_companies` / `order_booker_companies` link tables.
- Drops `invoices.invoice_maker` (it points at PocketBase's `_user`, which
  TrailBase does not share) and **reports how many invoices lost a maker** in the
  run log, so the loss is visible rather than silent.
- Skips a collection the source server does not have, instead of failing.
- Optionally clears the destination first, or runs in read-only "dry run" mode.

## Using it

1. Start the PocketBase server and this TrailBase backend.
2. Open this page (Plugins → Import from v1).
3. Enter the PocketBase URL and an admin identity/password, then the TrailBase
   URL and a user email/password, and press **Start import**.
4. Watch the progress bar, the log, and the per-collection summary. Rows that
   fail are listed with their PocketBase id.

Both servers must allow cross-origin requests from the browser. The credentials
are used only for the requests made while the import runs; nothing is stored.

## Notes

- Re-running without *Clear existing data* will duplicate rows.
- The guest reads the depot SQLite directly and keeps a fingerprint-based snapshot, refreshed on
  demand and by the minute poller, so data imported straight into TrailBase appears after the
  next refresh (or immediately via `POST /reports/refresh`).
- The default TrailBase URL is `http://127.0.0.1:4000`; the default PocketBase
  URL is `http://127.0.0.1:8090`.
