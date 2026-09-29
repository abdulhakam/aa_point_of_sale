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

  function init() {
    tick();
    setInterval(tick, 30000);
    initJobIndicator();
    enhancePrint();
    enhanceConfirm();
    enhanceSelects();
    enhanceTableFilter();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
