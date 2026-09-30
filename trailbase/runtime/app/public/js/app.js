/*
 * Minimal progressive enhancement — the app works without this file.
 *  - clock in the top bar
 *  - background refresh indicator (gray idle / blue fetching / red processing / yellow rendering)
 *  - PRINT buttons
 *  - confirmation on destructive forms
 *  - type-to-filter for long <select> lists (data-searchable)
 */
(function () {
  "use strict";

  function tick() {
    var el = document.querySelector("[data-clock]");
    if (!el) return;
    var now = new Date();
    // Two lines, like the legacy header: time on top, date below (see .header-clock).
    el.textContent =
      now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
      "\n" +
      now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  function enhancePrint() {
    document.querySelectorAll("[data-print]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.print();
      });
    });
  }

  function enhanceConfirm() {
    document.querySelectorAll("form[data-confirm]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        if (!window.confirm(form.getAttribute("data-confirm"))) event.preventDefault();
      });
    });
  }

  /** Add a small text filter above every long select so it stays usable without JS frameworks. */
  function enhanceSelects() {
    document.querySelectorAll("select[data-searchable]").forEach(function (select) {
      if (select.multiple) return;
      var filter = document.createElement("input");
      filter.type = "search";
      filter.placeholder = "filter…";
      filter.className = "select-filter";
      filter.setAttribute("aria-label", "Filter options");
      select.parentNode.insertBefore(filter, select);
      filter.addEventListener("input", function () {
        var needle = filter.value.toLowerCase();
        Array.prototype.forEach.call(select.options, function (option) {
          if (option.value === "") return;
          option.hidden = needle !== "" && option.text.toLowerCase().indexOf(needle) === -1;
        });
      });
    });
  }

  /**
   * Background refresh state, polled from /reports/status and shown as a dot:
   * gray = idle, blue = fetching from TrailBase, red = processing views,
   * yellow = rendering reports.
   */
  function initJobIndicator() {
    var el = document.querySelector("[data-job]");
    if (!el) return;
    var text = el.querySelector("[data-job-text]");
    var form = el.closest("[data-job-form]");
    var LABELS = { idle: "idle", fetch: "fetching", process: "processing", render: "rendering", error: "error" };

    function ago(ms) {
      if (!ms) return "";
      var s = Math.round((Date.now() - ms) / 1000);
      if (s < 60) return s + "s ago";
      if (s < 3600) return Math.round(s / 60) + "m ago";
      return Math.round(s / 3600) + "h ago";
    }

    function detail(state) {
      var n;
      if (state.phase === "fetch") return "";
      if (state.phase === "process") { n = (state.rebuiltViews || []).length; return n ? " " + n + " view(s)" : ""; }
      if (state.phase === "render") { n = (state.rebuiltReports || []).length; return n ? " " + n + " report(s)" : ""; }
      if (state.phase === "error") return state.error ? " " + state.error : "";
      return state.lastRunAt || state.lastCheckedAt ? " · " + ago(state.lastRunAt || state.lastCheckedAt) : " · not loaded";
    }

    function tooltip(state) {
      if (!state) return "";
      if (state.phase && state.phase !== "idle") return "Background refresh: " + state.phase;
      var bits = [];
      if (state.lastRunAt) bits.push("last change " + ago(state.lastRunAt));
      if (state.changed && state.changed.length) bits.push("changed: " + state.changed.join(", "));
      if (state.rebuiltViews && state.rebuiltViews.length) bits.push("views rebuilt: " + state.rebuiltViews.join(", "));
      if (state.durationMs != null) bits.push("took " + state.durationMs + "ms");
      bits.push((state.rows || 0).toLocaleString() + " rows in memory");
      return bits.join(" · ");
    }

    function paint(state) {
      var phase = state && state.phase ? state.phase : "idle";
      // Keep the navbar-link classes; only the phase modifier is ours.
      el.className = "nav-link job job--" + phase;
      if (text) text.textContent = (LABELS[phase] || phase) + (state ? detail(state) : "");
      el.title = tooltip(state) || "Background data refresh";
    }

    function poll() {
      fetch("/reports/status", { headers: { accept: "application/json" } })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (state) { if (state) paint(state); })
        .catch(function () {});
    }

    poll();
    setInterval(poll, 3000);

    // The indicator is also the manual refresh control: submit, then reload so the page
    // renders from the rebuilt snapshot. Without JS the form POST does the same thing.
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (el.getAttribute("aria-busy") === "true") return;
        el.setAttribute("aria-busy", "true");
        el.disabled = true;
        if (text) text.textContent = "refreshing…";
        fetch(form.getAttribute("action"), { method: "POST", headers: { accept: "application/json" } })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (state) { if (state) paint(state); })
          .catch(function () {})
          .then(function () { window.location.reload(); });
      });
    }
  }

  /** Client-side row filter for management tables (legacy has a "Search" box above the grid). */
  function enhanceTableFilter() {
    document.querySelectorAll("[data-table-filter]").forEach(function (input) {
      var table = document.querySelector(input.getAttribute("data-table-filter"));
      if (!table || !table.tBodies.length) return;
      var rows = Array.prototype.slice.call(table.tBodies[0].rows);
      var dataRows = rows.filter(function (row) { return !row.querySelector("td.empty"); });
      var empties = rows.filter(function (row) { return row.querySelector("td.empty"); });
      input.addEventListener("input", function () {
        var needle = input.value.toLowerCase();
        dataRows.forEach(function (row) {
          row.hidden = row.textContent.toLowerCase().indexOf(needle) === -1;
        });
        // The empty-state row stands in for a table that has no data, never for a search that
        // matched nothing.
        empties.forEach(function (row) { row.hidden = dataRows.length > 0; });
      });
    });
  }

  /**
   * The invoice line editor: choosing an item fills the price from the item's own, and a carton
   * size offers the "whole cartons" shortcut. Purely a convenience — the fields stay editable, so
   * the form still works with this file absent.
   */
  function enhanceLineEditor() {
    document.querySelectorAll('form select[name="item"]').forEach(function (select) {
      var form = select.closest("form");
      if (!form) return;
      var price = form.querySelector('input[name="price"]');
      var qty = form.querySelector('input[name="qty"]');
      var apply = function () {
        var option = select.options[select.selectedIndex];
        if (!option || !option.dataset.price || !price) return;
        if (!price.value || Number(price.value) === 0) price.value = option.dataset.price;
        if (qty && option.dataset.box && (!qty.value || Number(qty.value) === 1)) {
          qty.dataset.suggested = option.dataset.box;
        }
      };
      select.addEventListener("change", apply);
      if (qty && qty.dataset.suggested) qty.value = qty.dataset.suggested;
    });
  }

  // ---------------------------------------------------------------- money, mirrored
  //
  // These four functions are the browser copy of app/lib/invoice-lifecycle.js. The grid shows a
  // recalculated number the instant a cell changes, with no round trip, so the same formula runs in
  // two places and they must agree to the paisa — otherwise the operator sees the number move when
  // the row saves. See vault/decisions/client-side-live-recalculation.md: the risk is formula
  // equivalence, not evaluation, which is why there is no spreadsheet engine here.
  //
  // The server's `round2` is Math.round((v + EPSILON) * 100) / 100. `PAISA` is that same round-half-up
  // done in integers, because accumulating in binary float and rounding once at the end is exactly
  // how a display and a ledger start to disagree.
  var EPSILON = Number.EPSILON;
  var PAISA = 100;

  function round2(v) {
    return Math.round((Number(v) + EPSILON) * PAISA) / PAISA;
  }

  /** The line before the invoice's own discounts. Negative qty is a return. */
  function lineAmount(line) {
    var qty = Number(line.qty) || 0;
    var price = Number(line.price) || 0;
    var d1 = Number(line.discount_1) || 0;
    var d2 = Number(line.discount_2) || 0;
    var drs = Number(line.discount_rs) || 0;
    return price * qty * (1 - d1 / 100) * (1 - d2 / 100) - drs;
  }

  function lineTotal(line) {
    return round2(lineAmount(line));
  }

  /** The line after the invoice's percent discounts: what the customer owes for the line. */
  function lineNet(line, invD1, invD2) {
    return round2(lineAmount(line) * (1 - (Number(invD1) || 0) / 100) * (1 - (Number(invD2) || 0) / 100));
  }

  /**
   * The invoice header chain, identical to buildInvoiceView in app/compute/views.js:
   *   s = Σ round2(line); afterD1 = s - s·d1/100; unrounded = afterD1 - afterD1·d2/100;
   *   final = round2(unrounded - discount_rs)
   */
  function invoiceTotals(lines, header) {
    var d1 = Number(header.discount_1) || 0;
    var d2 = Number(header.discount_2) || 0;
    var drs = Number(header.discount_rs) || 0;
    var sum = 0;
    for (var i = 0; i < lines.length; i++) sum += lineTotal(lines[i]);
    sum = round2(sum);
    var afterD1 = sum - (sum * d1) / 100;
    var unrounded = afterD1 - (afterD1 * d2) / 100;
    return { lineSum: sum, afterDiscount: round2(unrounded), total: round2(unrounded - drs) };
  }

  function money(v) {
    return (Math.round((Number(v) + EPSILON) * PAISA) / PAISA).toFixed(2);
  }

  // ---------------------------------------------------------------- invoice grid
  //
  // A spreadsheet over one invoice. Cells that are calculated (amount, line total, invoice total)
  // are read-only and always come from the formulas above; the item cell is a server-resolved
  // select; everything else is typed. A return is a row with a negative quantity — the grid does
  // not need a mode for it, and neither does the ledger.
  //
  // Read-only when another device holds the lease: the cells are disabled and the owner is named,
  // rather than a dead form with no reason (vault/decisions/single-writer-per-invoice.md).
  function enhanceGrid() {
    var grid = document.querySelector("[data-grid]");
    if (!grid) return;
    var editable = grid.getAttribute("data-editable") === "1";
    var basePath = grid.getAttribute("data-path") || "";
    var rows = [].slice.call(grid.querySelectorAll("tbody tr[data-line]"));

    function lineOf(row) {
      var cell = function (name) {
        var input = row.querySelector('[name="' + name + '"]');
        return input ? input.value : "";
      };
      return {
        id: row.getAttribute("data-line"),
        item: cell("item"),
        qty: cell("qty"),
        price: cell("price"),
        cost_price: cell("cost_price"),
        discount_1: cell("discount_1"),
        discount_2: cell("discount_2"),
        discount_rs: cell("discount_rs"),
        scheme: cell("scheme"),
      };
    }

    /** Recalculate one row and the invoice totals. No request, no wait. */
    function recalc() {
      var invD1 = Number(grid.getAttribute("data-d1")) || 0;
      var invD2 = Number(grid.getAttribute("data-d2")) || 0;
      var lines = [];
      rows.forEach(function (row) {
        var line = lineOf(row);
        var net = lineNet(line, invD1, invD2);
        var cell = row.querySelector("[data-amount]");
        if (cell) cell.textContent = money(net);
        var qtyCell = row.querySelector("[data-qty-display]");
        if (qtyCell) {
          var select = row.querySelector('select[name="item"]');
          var option = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
          var box = option && option.dataset.box ? Number(option.dataset.box) : 0;
          qtyCell.textContent = box ? qtyAsText(box, line.qty) : "";
        }
        lines.push(line);
      });
      var totals = invoiceTotals(lines, { discount_1: invD1, discount_2: invD2, discount_rs: 0 });
      var sum = grid.querySelector("[data-sum]");
      if (sum) sum.textContent = money(totals.total);
    }

    function qtyAsText(box, qty) {
      var b = Number(box) || 0;
      var n = Number(qty) || 0;
      if (!b) return String(n);
      var abs = Math.abs(n);
      var sign = n < 0 ? "-" : "";
      var ctns = Math.floor(abs / b);
      var units = abs % b;
      var parts = [];
      if (ctns) parts.push(ctns + (ctns === 1 ? " ctn" : " ctns"));
      if (units || !ctns) parts.push(units + (units === 1 ? " unit" : " units"));
      return sign + parts.join(" ");
    }

    if (editable) {
      // Choosing an item fills the price and the cost from the item's own, unless they were
      // already set — the operator's number always wins.
      rows.forEach(function (row) {
        var select = row.querySelector('select[name="item"]');
        var price = row.querySelector('input[name="price"]');
        var cost = row.querySelector('input[name="cost_price"]');
        if (!select || !price) return;
        select.addEventListener("change", function () {
          var option = select.options[select.selectedIndex];
          if (option && option.dataset.price !== undefined) {
            if (!price.value || Number(price.value) === 0) price.value = option.dataset.price;
            if (cost && !cost.value) cost.value = option.dataset.cost || "";
          }
          recalc();
        });
        row.querySelectorAll("input").forEach(function (input) {
          input.addEventListener("input", recalc);
        });
      });
    }
    recalc();
  }

  function init() {
    tick();
    setInterval(tick, 30000);
    initJobIndicator();
    enhancePrint();
    enhanceConfirm();
    enhanceSelects();
    enhanceTableFilter();
    enhanceLineEditor();
    enhanceGrid();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
