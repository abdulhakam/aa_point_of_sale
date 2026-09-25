---
type: Note
status: Active
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]"
  - "[[TB-0003 Migrate PocketBase data into the TrailBase schema]]"
  - "[[Data Model]]"
  - "[[Issue — Report cache lag after a client-side import]]"
created: 2026-09-25
updated: 2026-09-25
tags:
  - trailbase
  - migration
  - pocketbase
  - plugins
---

# Import from v1 Plugin

## What it is

The first plugin of the [[Frontend — TrailBase Server-Rendered App]]: a single, backend-free page at
`/plugins/import-from-v1/` that copies every business record from a running PocketBase (v1) server into
this TrailBase depot. It lives entirely in `frontend-ssr/plugins/import-from-v1/` (`meta.md` +
`index.html`) and talks straight from the browser to both servers, so it adds nothing to the app's
runtime and can be deleted whole.

## How it runs

1. Signs in to PocketBase (admin) and to TrailBase (user) directly from the browser.
2. Reads each source collection page by page, in dependency order:
   masters → link tables → invoices → return references → transactions → payments.
3. Writes through the TrailBase record APIs in batches of 500 (one bulk `POST` per batch; a batch that
   contains a bad row is retried row by row so the failure names the offending PocketBase id).

The mapping from the source shape to the TrailBase shape:

| PocketBase | TrailBase |
|---|---|
| `parties.type`: `''` / `customer` / `supplier` | `NULL` / `0` / `1` |
| `invoices.type`: `''` / `purchase` / `sale` / `return` / `difference` | `NULL` / `0` / `1` / `2` / `3` |
| `payments.type`: `''` / `sending` / `recieving` / `return` | `NULL` / `0` / `1` / `2` |
| `parties.company`, `order_bookers.company` (JSON id arrays) | one `party_companies` / `order_booker_companies` row per id |
| `invoices.invoice_maker` (relation to PocketBase `_user`) | dropped — TrailBase auth is a separate store |
| `items.barcode` / `items.display_id` | read when the source has them, else left empty |
| PocketBase ids | fresh TrailBase UUIDv7; the old→new map drives relation translation |

The exact field list is the inline `PLAN` in `index.html`; `WIPE_ORDER` is its reverse for the optional
clear.

## Controls

- **Clear existing TrailBase data first** — deletes rows in reverse dependency order before copying. It is
  one `DELETE` request per row (the record API has no bulk delete), so it is slow on large tables.
- **Dry run** — reads and translates only; writes nothing.
- **Stop** — finishes the current request and stops.

The page shows a percentage bar, overall records done/total, a sliding-window speed readout (`rec/s` when
≥ 1, otherwise `s/rec`), a log and per-row errors.

## Verification

Driven in a real Chrome against the live `backend/p_data` dataset: **60,245 / 60,245, 0 failures**, every
per-collection count matching the source, and the Stock Report total matching the source view exactly.
Full detail in [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]].

## Caveats

- **Report cache lag.** The import cannot invalidate the app's server-side report cache, so the dashboard
  and reports may show stale numbers for up to `CACHE_TTL_SECONDS` (60 s) after an import — see
  [[Issue — Report cache lag after a client-side import]].
- **Re-running without Clear duplicates rows.** There is no idempotency key; the run always inserts.
- Running it needs both servers reachable from the browser (which both allow) and the credentials are used
  only for the requests made while it runs.

## Related

- [[TB-0007 Add the plugins hub and the Import from v1 migration plugin]]
- [[TB-0003 Migrate PocketBase data into the TrailBase schema]]
- [[Decision — Run the PocketBase migration client-side as a plugin]]
- [[Frontend — TrailBase Server-Rendered App]]
