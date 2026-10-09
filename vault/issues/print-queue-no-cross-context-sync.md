---
title: "Print queue did not update across tabs or the preview iframe until a reload"
type: issue
status: fixed
severity: medium
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, print-queue, localStorage, bug]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[print-queue-parity-fix-2026-10-08]]", "[[why-some-selects-are-not-comboboxes]]"]
---

# Print queue did not update across tabs or the preview iframe until a reload

## Symptom

Adding an invoice to the print queue (`Add to Print Queue` on `/invoices/<id>/view`) did not show up on
an already-open `/print` rail. The operator had to refresh `/print` to see it.

## Cause

The queue is browser `localStorage` under `print-queue`, owned by `app/public/js/print-queue.js`.
`paint()` ran only:
- once at page load, and
- after an `add`/`remove`/`clear` in the **same document**.

There was **no `storage`-event listener**. `localStorage` is shared, but a change made in another
document — a second tab, or the `/print` preview `<iframe>` (which is a separate browsing context) —
does not call the open page's `paint()`, so the rail was stale until a reload. The `storage` event is
exactly the browser's notification for this and was simply not used.

## Fix

`print-queue.js` listens for `storage` and repaints:

```js
function onStorage(event) {
  if (event.key && event.key !== KEY) return;
  paint();
  syncQueuePage(); // the queue page also nudges to the current ?ids= (or bare, when cleared)
}
window.addEventListener("storage", onStorage);
```

The `storage` event fires in every OTHER same-origin window (a sibling tab, and a parent from its
iframe) and never in the one that made the change, so same-document changes stay covered by the direct
`paint()` calls and are not doubled.

## Evidence (2026-10-09)

Two tabs in the same origin: `/print?type=0` open in one, `/invoices/<id>/view` in the other. Clicking
`Add to Print Queue` on the sheet made the `/print` rail show the invoice (`20240501`) with **no
reload**; clearing the queue emptied it again. `print-queue-check` 14/14.

## Related

- [[print-queue-parity-fix-2026-10-08]] — the queue's earlier parity fix.
- [[why-some-selects-are-not-comboboxes]] — the other half of the same report (the "searchable select"
  question), which was not a defect.
