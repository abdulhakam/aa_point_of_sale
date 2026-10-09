/*
 * The print queue — the LEGACY queue, kept in the browser.
 *
 * The legacy app held the print queue in `localStorage` under the key `print-queue`: "Add to Print
 * Queue" on the print page pushed `{invoice, transactions}`, the picker rail and
 * `/app/invoices/printinvoice/queue` read it back, deduped by invoice number, and printing was the
 * browser's dialog over the rendered sheets. This file is that queue for the guest: it stores a small
 * `{id, invoiceNo, type}` per entry, renders the rail on `/print`, and hands the ids to `/print/queue`
 * through `?ids=` so the server can render the sheets (the same builder the single view uses).
 *
 * Progressive enhancement, like the rest of the app: with this file absent the picker's form still
 * works as a plain GET (View Invoice reloads the page with the chosen invoice's preview), and the queue
 * is simply empty — nothing here is load-bearing for a page that already rendered.
 */
(function () {
  "use strict";

  var KEY = "print-queue";

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      /* private mode / quota: the queue is best-effort, never fatal */
    }
  }

  /** Accept both this app's `{id, invoiceNo, type}` and a legacy `{invoice:{…}}` entry. */
  function norm(entry) {
    if (entry && entry.invoice) {
      return { id: entry.invoice.id, invoiceNo: entry.invoice.invoiceNo, type: entry.invoice.type };
    }
    return { id: entry && entry.id, invoiceNo: entry && entry.invoiceNo, type: entry && entry.type };
  }

  /** Legacy dedupes by invoice number, first occurrence wins. */
  function dedupe(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (raw) {
      var entry = norm(raw);
      if (!entry.id) return;
      var key = entry.invoiceNo != null && entry.invoiceNo !== "" ? "n:" + entry.invoiceNo : "id:" + entry.id;
      if (seen[key]) return;
      seen[key] = 1;
      out.push(entry);
    });
    return out;
  }

  function ids() {
    return dedupe(read()).map(function (e) { return e.id; });
  }

  function add(entry) {
    var list = dedupe(read());
    list.push(norm(entry));
    save(dedupe(list));
    paint();
  }

  function remove(id) {
    save(read().filter(function (e) { return String(norm(e).id) !== String(id); }));
    paint();
  }

  function clear() {
    save([]);
    paint();
  }

  function paint() {
    var items = dedupe(read());
    document.querySelectorAll("[data-print-queue]").forEach(function (box) {
      box.textContent = "";
      if (!items.length) {
        var empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "Nothing in queue";
        box.appendChild(empty);
        return;
      }
      items.forEach(function (entry) {
        var row = document.createElement("div");
        row.className = "pq-item";

        var link = document.createElement("a");
        link.href = "/invoices/" + entry.id + "/view?print=1";
        link.textContent = entry.invoiceNo != null && entry.invoiceNo !== "" ? String(entry.invoiceNo) : String(entry.id);
        row.appendChild(link);

        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "pq-remove";
        rm.setAttribute("data-pq-remove", entry.id);
        rm.setAttribute("title", "Remove from queue");
        rm.textContent = "✕";
        row.appendChild(rm);

        box.appendChild(row);
      });
    });
  }

  /** On the queue page, make `?ids=` agree with localStorage before/after the server rendered it. */
  function syncQueuePage() {
    var page = document.querySelector("[data-pq-queue-page]");
    if (!page) return;
    var have = ids().join(",");
    var want = page.getAttribute("data-ids") || "";
    if (have && have !== want) {
      window.location.replace("/print/queue?ids=" + encodeURIComponent(have));
    } else if (!have && want) {
      // The queue was cleared in another tab; drop the stale sheets.
      window.location.replace("/print/queue");
    }
  }

  /** The picker: reload the invoice list when the type changes, and preview the chosen invoice live. */
  function enhancePicker() {
    var form = document.querySelector("[data-print-picker]");
    if (!form) return;

    var typeSelect = form.querySelector("[data-print-type]");
    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        window.location.href = "/print?type=" + encodeURIComponent(typeSelect.value);
      });
    }

    var invoiceSelect = form.querySelector("[data-print-invoice]");
    var frame = document.querySelector("[data-print-frame]");
    var open = document.querySelector("[data-print-open]");
    var hint = document.querySelector(".pq-hint");
    if (!invoiceSelect) return;
    invoiceSelect.addEventListener("change", function () {
      var id = invoiceSelect.value;
      // Ids are URL-safe base64, which includes `=` padding but never `/`, `?` or `#`, so the raw value
      // is safe in a path — the same form every server-rendered `/invoices/<id>/…` link already uses.
      if (frame) frame.src = id ? "/invoices/" + id + "/view" : "about:blank";
      if (open) {
        if (id) { open.href = "/invoices/" + id + "/view"; open.hidden = false; }
        else { open.hidden = true; }
      }
      if (hint) hint.hidden = Boolean(id);
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest
      ? event.target.closest("[data-pq-add],[data-pq-remove],[data-pq-clear],[data-pq-print],[data-pq-goto]")
      : null;
    if (!target) return;

    if (target.hasAttribute("data-pq-add")) {
      event.preventDefault();
      add({
        id: target.getAttribute("data-id"),
        invoiceNo: target.getAttribute("data-no"),
        type: target.getAttribute("data-type"),
      });
      var html = target.innerHTML;
      target.disabled = true;
      target.innerHTML = "Added ✓";
      setTimeout(function () { target.disabled = false; target.innerHTML = html; }, 1200);
      return;
    }

    if (target.hasAttribute("data-pq-remove")) {
      event.preventDefault();
      remove(target.getAttribute("data-pq-remove"));
      if (document.querySelector("[data-pq-queue-page]")) {
        var left = ids();
        window.location.href = left.length ? "/print/queue?ids=" + encodeURIComponent(left.join(",")) : "/print/queue";
      }
      return;
    }

    if (target.hasAttribute("data-pq-clear")) {
      event.preventDefault();
      clear();
      if (document.querySelector("[data-pq-queue-page]")) window.location.href = "/print/queue";
      return;
    }

    if (target.hasAttribute("data-pq-print")) {
      event.preventDefault();
      window.print();
      return;
    }

    if (target.hasAttribute("data-pq-goto")) {
      event.preventDefault();
      var queued = ids();
      window.location.href = queued.length ? "/print/queue?ids=" + encodeURIComponent(queued.join(",")) : "/print/queue";
    }
  });

  function init() {
    paint();
    syncQueuePage();
    enhancePicker();
    // A marker a harness can wait on: the controls exist in the initial HTML, so a test that dispatches
    // `change` as soon as the select is found can race this file and see nothing happen. `hotkeys.js`
    // sets `data-hk-ready` for the same reason.
    document.documentElement.setAttribute("data-pq-ready", "1");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
