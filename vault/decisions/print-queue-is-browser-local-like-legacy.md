---
$schema: "./decisions.schema.json"
title: "The print queue is the legacy browser-side queue, not a durable server job"
type: decision
status: accepted
decided_on: 2026-10-08
created: 2026-10-08
tags: [printing, printqueue, parity, legacy, guest, invoice]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0021-invoices-cashmemos-printing]]", "[[invoice-entry-freshness-and-writes]]", "[[print-queue-parity-fix-2026-10-08]]", "[[invoice-and-print-discrepancies-between-guest-and-legacy-2026-10-06]]", "[[route-map]]", "[[jobs-in-process-durable-queue]]"]
---

# The print queue is the legacy browser-side queue, not a durable server job

The guest print queue was rebuilt on 2026-10-08 to be the **legacy** queue: an operator picks an
invoice by type and number, views it, adds it to a queue that lives in the browser
(`localStorage`, key `print-queue`), and prints the queue as one run of A5 sheets. This reverses the
earlier build ([[tb-0021-invoices-cashmemos-printing]], §Printing) and the design line in
[[invoice-entry-freshness-and-writes]] §6 that proposed a **durable queue job** (`print.run` over the
job engine, one leased step per slip).

## The choice

- **The queue is browser-local, exactly as legacy.** `localStorage["print-queue"]` holds one small
  `{id, invoiceNo, type}` per entry; the rail on `/print` and the page `/print/queue` read it back,
  deduped by invoice number, first occurrence winning — the legacy `PrintQueue` component's own rule.
- **`/print` is a picker, not a batch form.** Invoice Type + Invoice No selects, a "View Invoice"
  button, a live preview iframe, and the queue rail. Legacy only offered purchase and sale; the guest
  offers every invoice type it can build (purchase, sale, return, difference), because the guest builds
  return and difference invoices and they must be printable — a superset, no legacy capability lost.
- **The sheet carries the two legacy actions.** `/invoices/<id>/view` shows "Print Invoice Now" (the
  A5 sheet) and "Add to Print Queue" (pushes to `localStorage`), which is how legacy populates the queue
  from `/app/invoices/print`.
- **Printing is the browser's dialog** over server-rendered sheets, A5, one page each — unchanged.
- **The server-side `print.run` job was removed.** Nothing enqueues it now; keeping it would be a
  second, divergent queue.

## Why

- The instruction was to make the print queue **work exactly like legacy**. The legacy flow is the
  observable behaviour: add individual invoices to a persistent queue, print them together.
- The durable job was a **better mechanism** but a **different flow**: a date-range batch of every open
  invoice, asynchronous, with a job page and a minute poller. It did not match what staff do, and it
  was flagged as the print surface's outstanding difference in
  [[invoice-and-print-discrepancies-between-guest-and-legacy-2026-10-06]] §"Print queue — different
  flow".
- The queue is inherently **per-operator, per-browser** state. A durable server job made it shared and
  asynchronous; a browser queue is what legacy had and what the operator expects (it survives
  navigation and reloads, and clearing it is a local act).

## What this costs, and the accepted trade-offs

- **A queue does not survive clearing browser data**, and is not shared between operators or devices —
  the same limitation legacy had. This is accepted: it is the behaviour parity requires.
- **The queue page is a server render driven by `?ids=`.** The client reads `localStorage` and puts the
  ids in the query so the server can render each sheet from the same builder the single view uses; a
  direct hit on `/print/queue` with a non-empty queue is reconciled by the client. This is a small
  addition to the server-render-first design; it keeps the printed sheet and the on-screen sheet
  identical ([[print-queue-parity-fix-2026-10-08]]).
- **A queued invoice with no materialised document is skipped** rather than failing the run — the
  legacy queue drops a missing record the same way.

## Evidence

- The legacy queue is `localStorage` keyed `print-queue`: `legacyforparity/standalone/.next/static/
  chunks/app/app/invoices/printinvoice/queue/page-ed35353852310c4e.js` (module `20504`,
  `useLocalStorage({key:"print-queue"})`, dedupe by `invoice.invoiceNo`, `useReactToPrint` A5) and the
  same chunk in `printinvoice/page-…js`.
- The legacy picker (Invoice Type / Invoice No / View Invoice / preview iframe) is module `70930` of
  that file.
- "Add to Print Queue" lives on the legacy print page
  (`legacyforparity/standalone/.next/server/app/app/invoices/print/page.js`, module `37792`:
  `useLocalStorage({key:"print-queue"})`, then `r([...t,{transactions,invoice}])`).
- The guest rebuild is [[print-queue-parity-fix-2026-10-08]].

## Related

- [[print-queue-parity-fix-2026-10-08]] — the change record and its gates.
- [[invoice-entry-freshness-and-writes]] — §6 is corrected here.
- [[jobs-in-process-durable-queue]] — the engine the removed `print.run` job used; the engine itself is unchanged.
- [[route-map]] — `/print` and `/print/queue` rows.
