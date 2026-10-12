/*
 * Supply Summary picker helpers. The screen lists the sale invoices in a date range as a scrollable
 * grid of checkboxes; this adds "Select all" / "Clear" over them (`data-picker-all` / `data-picker-none`).
 *
 * The buttons are `type="button"` in the template, so clicking one cannot submit the form. Progressive
 * enhancement: without this file the checkboxes still work one by one.
 */
(function () {
  "use strict";

  function bind(root) {
    (root || document).querySelectorAll("[data-picker-all], [data-picker-none]").forEach(function (btn) {
      if (btn.__aaPickerBound) return;
      btn.__aaPickerBound = true;
      btn.addEventListener("click", function () {
        var scope = btn.closest("form") || document;
        var on = btn.hasAttribute("data-picker-all");
        scope.querySelectorAll('.picker-list input[type="checkbox"]').forEach(function (cb) { cb.checked = on; });
      });
    });
  }

  document.addEventListener("htmx:afterSwap", function (event) { bind(event.target || document); });
  document.addEventListener("DOMContentLoaded", function () { bind(document); });
  if (document.readyState !== "loading") bind(document);
})();
