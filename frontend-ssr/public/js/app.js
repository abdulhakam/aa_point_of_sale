/*
 * Minimal progressive enhancement — the app works without this file.
 *  - clock in the top bar
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
    el.textContent =
      now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) +
      " " +
      now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

  function init() {
    tick();
    setInterval(tick, 30000);
    enhancePrint();
    enhanceConfirm();
    enhanceSelects();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
