/*
 * Minimal progressive enhancement — the app works without this file.
 *  - background refresh indicator (gray idle / blue fetching / red processing / yellow rendering)
 *  - PRINT buttons
 *  - confirmation on destructive forms
 *  - type-to-filter for long <select> lists (data-searchable)
 */
(function () {
  "use strict";

  /**
   * Printing. A print link points at a real `?print=1` page, so a printout can be opened,
   * bookmarked or reloaded; the click also opens the browser's print dialog, because that is what
   * an operator expects from a button labelled PRINT. Without this the link would still work — it
   * would just not print by itself. A link with no href is the plain "print this page" case.
   */
  function enhancePrint(root) {
    root.querySelectorAll("[data-print]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        var href = btn.getAttribute("href");
        if (!href || href.charAt(0) === "#") {
          event.preventDefault();
          window.print();
          return;
        }
        event.preventDefault();
        var win = window.open(href, "_blank");
        if (!win) {
          // A popup blocker refused the new tab. The same URL is still a printable document, so
          // navigate to it rather than doing nothing.
          window.location.href = href;
          return;
        }
        var go = function () {
          try {
            win.focus();
            win.print();
          } catch (e) {
            /* the operator can print from the page that did open */
          }
        };
        // Print once the opened page's own layout has settled, or the dialog races the load.
        if (win.document && win.document.readyState === "complete") setTimeout(go, 150);
        else win.addEventListener("load", function () { setTimeout(go, 150); });
      });
    });
  }

  function enhanceConfirm(root) {
    root.querySelectorAll("form[data-confirm]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        if (!window.confirm(form.getAttribute("data-confirm"))) event.preventDefault();
      });
    });
  }

  /** Long selects are searchable — see `autocomplete.js`, which replaced the select-plus-filter-box
   *  pair this used to inject. The reasoning for leaving short selects alone is there. */
  function enhanceSelects() {}

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
          .then(function () {
            // Re-render the current page's CONTENT, not the whole document: after a data refresh the
            // figures may have moved, but the shell does not need to be rebuilt or its scripts
            // re-parsed. htmx fetches the same URL as a fragment and the afterSwap hook re-enhances it.
            // Falls back to a full reload if htmx is absent (no-JS-of-htmx path).
            if (window.htmx && typeof window.htmx.ajax === "function") {
              window.htmx.ajax("GET", location.pathname + location.search, {
                target: "#app-main",
                swap: "innerHTML",
                headers: { "X-Requested-With": "XMLHttpRequest" },
              });
            } else {
              window.location.reload();
            }
          });
      });
    }
  }

  /** Client-side row filter for management tables (legacy has a "Search" box above the grid). */
  function enhanceTableFilter(root) {
    root.querySelectorAll("[data-table-filter]").forEach(function (input) {
      var table = root.querySelector(input.getAttribute("data-table-filter"));
      if (!table || !table.tBodies.length) return;
      var rows = Array.prototype.slice.call(table.tBodies[0].rows);
      var dataRows = rows.filter(function (row) { return !row.querySelector("td.empty"); });
      var empties = rows.filter(function (row) { return row.querySelector("td.empty"); });

      // Each row's text is lowercased ONCE. `row.textContent.toLowerCase()` inside the handler meant two
      // fresh strings per row per keypress — 1,886 allocations on the 943-row parties list — to recompute
      // a haystack that only changes when the server sends a new page. Measured at 6.7 ms per keystroke
      // before this, 0.5 ms after (`tools/client-cost.mjs`). This was the single largest client-side cost
      // found anywhere in the app.
      var entries = dataRows.map(function (row) {
        return { row: row, hay: row.textContent.toLowerCase(), shown: true };
      });

      var last = null;
      input.addEventListener("input", function () {
        var needle = input.value.toLowerCase().trim();
        if (needle === last) return;
        last = needle;
        var hits = 0;
        entries.forEach(function (entry) {
          // Only touch `hidden` when it actually changes: writing it 943 times when the result is
          // unchanged invalidates layout 943 times, which is the expensive half of a filter.
          var show = needle === "" || entry.hay.indexOf(needle) !== -1;
          if (entry.shown !== show) {
            entry.row.hidden = !show;
            entry.shown = show;
          }
          if (show) hits++;
        });
        // The empty-state row stands in for a table that has no data, never for a search that
        // matched nothing.
        var showEmpty = hits === 0;
        empties.forEach(function (row) { if (!row.hidden !== showEmpty) row.hidden = !showEmpty; });
      });
    });
  }

  // The invoice line editor (choosing an item fills the price from the item's own) is now
  // `<aa-invoice-entry>` (components/invoice-entry.js): it is the same behaviour, declared by a tag in
  // the entry template instead of applied to every `form select[name="item"]` on the page. The grid's
  // item cells keep their richer version inside `enhanceGrid` below.

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
  function enhanceGrid(root) {
    var grid = root.querySelector("[data-grid]");
    if (!grid) return;
    var editable = grid.getAttribute("data-editable") === "1";
    var basePath = grid.getAttribute("data-path") || "";

    /**
     * Per-row cache, built ONCE.
     *
     * The previous version called `lineOf(row)` on every recalculation, and `lineOf` did seven
     * `querySelector` calls per row — so one keystroke in one cell cost 7 x 37 = 259 selector queries
     * and then rewrote all 37 amount cells and all 37 quantity labels. The values it was reading had not
     * changed for 36 of those rows. Now each row's inputs and read-only outputs are looked up once, the
     * numbers are cached per row, and a keystroke recomputes **one** row.
     */
    var rows = [].slice.call(grid.querySelectorAll("tbody tr[data-line]")).map(function (row) {
      var cell = function (name) { return row.querySelector('[name="' + name + '"]'); };
      return {
        row: row,
        cells: {
          item: cell("item"),
          qty: cell("qty"),
          price: cell("price"),
          cost_price: cell("cost_price"),
          discount_1: cell("discount_1"),
          discount_2: cell("discount_2"),
          discount_rs: cell("discount_rs"),
          scheme: cell("scheme"),
        },
        amountCell: row.querySelector("[data-amount]"),
        qtyCell: row.querySelector("[data-qty-display]"),
        priceBaseline: row.querySelector("[data-price-baseline]"),
        net: 0,
      };
    });

    /**
     * The INVOICE-level discounts, read from the header form's inputs.
     *
     * ⚠️ These used to come from `grid.getAttribute("data-d1")` / `data-d2` — attributes rendered once, at
     * page load — and `discount_rs` was passed to `invoiceTotals` as a hardcoded `0`. So the preview
     * ignored the Discount %, Discount 2 % and Discount Rs fields entirely: typing 25 into Discount %
     * changed nothing on screen. Verified 2026-10-05 on invoice `AaEHwKG8d…`, 37 lines: header Discount %
     * 0 -> 25 and Discount Rs 34.99 -> 500, and no row amount moved.
     *
     * The attributes are kept as the fallback for a page with no header form. Selector is
     * `form[action$="/header"]` because the header inputs carry the SAME names as the per-row inputs, so
     * `input[name="discount_1"]` alone is ambiguous.
     */
    var headerForm = root.querySelector('form[action$="/header"]');
    var headerCell = function (name) {
      return headerForm ? headerForm.querySelector('[name="' + name + '"]') : null;
    };
    var headerD1 = headerCell("discount_1");
    var headerD2 = headerCell("discount_2");
    var headerDrs = headerCell("discount_rs");

    var invDiscounts = function () {
      return {
        discount_1: Number(headerD1 ? headerD1.value : grid.getAttribute("data-d1")) || 0,
        discount_2: Number(headerD2 ? headerD2.value : grid.getAttribute("data-d2")) || 0,
        discount_rs: Number(headerDrs ? headerDrs.value : 0) || 0,
      };
    };

    /**
     * The "Invoice total" stat.
     *
     * ⚠️ It used to be found with `grid.querySelector("[data-sum]")`, but `[data-sum]` is at
     * `invoices/{id}/grid/page.html.jinja:64` — inside the Lines card's toolbar, ABOVE the `<form data-grid>` at line 73. So the
     * query returned null and the total was never written. Verified 2026-10-05: setting a 37-line
     * invoice's first quantity 72 -> 999 moved that line's amount 8,249.76 -> 114,465.42 and left the
     * stat frozen at its server-rendered 180,900.00 — a recalculated line beside a stale invoice total,
     * which is the worst shape an accounting screen can take. Looked up on the document, not the grid.
     */
    var sumCell = root.querySelector("[data-sum]");

    /**
     * The item's own sale price, shown beside the editable price so an operator who types over the
     * cell still sees the number they adjusted away from ("was 8.33, sold 8.00"). It is the SAME
     * `data-price` value that fills the price on selection, so the baseline and the fill can never
     * disagree. Read-only; the operator's number always wins.
     */
    function updateBaseline(entry) {
      if (!entry.priceBaseline) return;
      var select = entry.cells.item;
      var option = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
      var price = option && option.dataset.price !== undefined && option.dataset.price !== "" ? option.dataset.price : "";
      entry.priceBaseline.textContent = price ? "list " + Number(price).toFixed(2) : "";
    }

    function lineOf(entry) {
      var c = entry.cells;
      return {
        id: entry.row.getAttribute("data-line"),
        item: c.item ? c.item.value : "",
        qty: c.qty ? c.qty.value : "",
        price: c.price ? c.price.value : "",
        cost_price: c.cost_price ? c.cost_price.value : "",
        discount_1: c.discount_1 ? c.discount_1.value : "",
        discount_2: c.discount_2 ? c.discount_2.value : "",
        discount_rs: c.discount_rs ? c.discount_rs.value : "",
        scheme: c.scheme ? c.scheme.value : "",
      };
    }

    /** One row's own numbers, and write only that row's two read-only cells. */
    function recalcRow(entry, invD1, invD2) {
      var line = lineOf(entry);
      entry.net = lineNet(line, invD1, invD2);
      if (entry.amountCell) entry.amountCell.textContent = money(entry.net);
      if (entry.qtyCell) {
        var select = entry.cells.item;
        var option = select && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
        var box = option && option.dataset.box ? Number(option.dataset.box) : 0;
        entry.qtyCell.textContent = box ? qtyAsText(box, line.qty) : "";
      }
    }

    /**
     * Recalculate. `changed` is the row that was edited; omit it to redo every row, which is what a
     * change to an invoice-level discount requires because d1/d2 are in every row's net.
     *
     * The total is a numeric re-sum of the cached per-row nets. That is still O(rows) arithmetic, and it
     * has to be — the total depends on every line — but it is a loop over numbers rather than 259 DOM
     * queries and 74 text writes.
     */

    /**
     * Recalculate. Three entry points, because the three inputs have different blast radii:
     *
     *   - a LINE cell affects that line's net, so recompute that line and re-sum the totals;
     *   - an invoice-level Discount % or Discount 2 % is in EVERY line's net, so every line must be
     *     recomputed — that is the one case where O(rows) arithmetic is genuinely required;
     *   - an invoice-level Discount Rs is applied once at the end of the header chain, so it moves the
     *     total and NO line. Recomputing 37 rows because a flat amount changed is 36 rows of work for
     *     nothing, which is the same mistake as the per-keystroke full recompute, one level up.
     */
    function recalcTotals() {
      var inv = invDiscounts();
      // `invoiceTotals` is handed the SAME lines it was always handed and the SAME header shape, so the
      // arithmetic is untouched by this rewrite. Only the number of times it runs, and the inputs it
      // reads, changed.
      var totals = invoiceTotals(rows.map(lineOf), inv);
      if (sumCell) sumCell.textContent = money(totals.total);
    }

    function recalcLine(entry) {
      var inv = invDiscounts();
      recalcRow(entry, inv.discount_1, inv.discount_2);
      recalcTotals();
    }

    function recalcAll() {
      var inv = invDiscounts();
      rows.forEach(function (entry) { recalcRow(entry, inv.discount_1, inv.discount_2); });
      recalcTotals();
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
      rows.forEach(function (entry) {
        var select = entry.cells.item;
        var price = entry.cells.price;
        var cost = entry.cells.cost_price;
        if (select && price) {
          select.addEventListener("change", function () {
            var option = select.options[select.selectedIndex];
            if (option && option.dataset.price !== undefined) {
              if (!price.value || Number(price.value) === 0) price.value = option.dataset.price;
              if (cost && !cost.value) cost.value = option.dataset.cost || "";
            }
            updateBaseline(entry);
            recalcLine(entry);
          });
        }
        // ONE listener on the row rather than eight on the inputs. The row is already in hand from the
        // cache, so there is no per-input closure and no lookup of which row this input belongs to.
        entry.row.addEventListener("input", function () { recalcLine(entry); });
      });

      // The header's percent discounts reach every line; its flat amount reaches only the total.
      [headerD1, headerD2].forEach(function (input) {
        if (input) input.addEventListener("input", recalcAll);
      });
      if (headerDrs) headerDrs.addEventListener("input", recalcTotals);
    }
    rows.forEach(updateBaseline);
    recalcAll();
  }

  /**
   * Sortable management tables: click a column header to sort, click again to reverse. The header
   * carries a `data-sort-dir` marker the stylesheet turns into an arrow. Sorts the rows in place —
   * a row is still the same element, so the client-side filter (which toggles `hidden` on the same
   * nodes) keeps working, and only visible rows are reordered.
   */
  function enhanceTableSort(root) {
    var cellText = function (row, index) {
      var cell = row.cells && row.cells[index];
      return cell ? (cell.textContent || "").replace(/\s+/g, " ").trim() : "";
    };
    var compare = function (a, b) {
      var na = parseFloat(String(a).replace(/[,\u20ac\u00a3\u20b9\s]/g, ""));
      var nb = parseFloat(String(b).replace(/[,\u20ac\u00a3\u20b9\s]/g, ""));
      if (isFinite(na) && isFinite(nb) && a !== "" && b !== "") return na - nb;
      return a < b ? -1 : a > b ? 1 : 0;
    };
    root.querySelectorAll("table[data-sortable]").forEach(function (table) {
      var headers = Array.prototype.slice.call(table.querySelectorAll("th[data-sort]"));
      if (!headers.length || !table.tBodies.length) return;
      var tbody = table.tBodies[0];
      headers.forEach(function (th, colIndex) {
        var button = th.querySelector(".th-sort");
        if (!button) return;
        button.addEventListener("click", function () {
          var dir = th.getAttribute("data-sort-dir") === "asc" ? "desc" : "asc";
          headers.forEach(function (h) { h.removeAttribute("data-sort-dir"); });
          th.setAttribute("data-sort-dir", dir);
          var rows = Array.prototype.slice.call(tbody.rows).filter(function (r) {
            return !r.querySelector("td.empty");
          });
          rows.sort(function (a, b) {
            return compare(cellText(a, colIndex), cellText(b, colIndex)) * (dir === "asc" ? 1 : -1);
          });
          rows.forEach(function (r) { tbody.appendChild(r); });
        });
      });
    });
  }

  /**
   * Every enhancement that belongs to the CONTENT area, scoped to `root`.
   *
   * `#app-main` is the only element htmx swaps on a boosted navigation, so the content is the only
   * part that needs re-enhancing. Called once on load with `document`, and again on `htmx:afterSwap`
   * with the swapped target. The shell-only work (the clock and the job indicator) is deliberately
   * NOT here — it must run once, and re-running it would stack a second `setInterval`.
   */
  function enhanceContent(root) {
    enhancePrint(root);
    enhanceConfirm(root);
    enhanceTableFilter(root);
    enhanceTableSort(root);
    enhanceGrid(root);
  }

  function init() {
    // The header clock is `<aa-live-time>` now (components/live-time.js), not a timer here: it belongs
    // to the element that shows it, and it ticks every second rather than every 30.
    initJobIndicator();
    enhanceContent(document);
    // Seed the reference-cache version the page loaded with, so a swapped fragment's out-of-band
    // version can be compared against it in the afterSwap hook below.
    var vmeta = document.getElementById("aa-refdb-version");
    window.__AA_REFDB_VERSION__ = vmeta ? (vmeta.getAttribute("content") || "") : "";
  }

  // htmx swapped new content into `#app-main`. Re-run the content enhancers on it; custom elements
  // (aa-date-input, aa-modal) upgrade themselves on insertion, but the listeners app.js and
  // autocomplete.js attach to plain elements do not survive a swap, so both are re-run here.
  document.addEventListener("htmx:afterSwap", function (event) {
    var target = (event.detail && event.detail.target) || event.target;
    if (!target) return;
    // The tab title travels in the fragment as a hidden marker (layout.html.jinja emits it only when there
    // is no <head> to carry one), so a boosted nav updates the title instead of leaving the previous
    // page's. Read from the target, falling back to the document for an out-of-band swap.
    var marker = (target.querySelector && target.querySelector("[data-aa-title]")) ||
      document.querySelector("[data-aa-title]");
    if (marker) document.title = marker.getAttribute("data-aa-title");
    // Apply per-browser preferences BEFORE re-enhancing: a trimmed invoice picker must be what the
    // autocomplete combobox is built from (settings.js `apply`/`hydrateForm`).
    var st = window.__AA_SETTINGS__;
    if (st && typeof st.apply === "function") st.apply(target);
    if (st && typeof st.hydrateForm === "function") st.hydrateForm(target);
    // The fragment carries the current reference-cache version out-of-band (layout.html.jinja). When it
    // moves, tell refdb to re-sync so the IndexedDB store is not left at the version the last full
    // page loaded with. A matching version is a no-op.
    var vmeta = document.getElementById("aa-refdb-version");
    if (vmeta && window.__AA_REFDB__ && typeof window.__AA_REFDB__.reload === "function") {
      var version = vmeta.getAttribute("content") || "";
      if (version && version !== window.__AA_REFDB_VERSION__) {
        window.__AA_REFDB_VERSION__ = version;
        window.__AA_REFDB__.reload();
      }
    }
    enhanceContent(target);
    var ac = window.__AA_AUTOCOMPLETE__;
    if (ac && typeof ac.enhanceAll === "function") ac.enhanceAll(target);
    // After the combobox exists: repopulate an invoice picker from the invoice cache and let it re-read
    // (`refdb:select`). Async, so the server-rendered fallback shows first.
    var idb = window.__AA_INVOICEDB__;
    if (idb && typeof idb.enhanceAll === "function") idb.enhanceAll(target);
  });

  // Exposed so a harness (and the htmx hook above) can re-enhance a subtree without a reload.
  window.__AA_ENHANCE__ = enhanceContent;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
