/*
 * Per-browser settings — small UI preferences stored in `localStorage` under `aa-settings`.
 *
 * WHY. Some preferences are about how an operator likes to work, not about the data, and there is no
 * reason to store them on the server (they would then follow the user to every machine and need a
 * migration, an API and a schema). They live in the browser, like the print queue
 * ([[print-queue-is-the-legacy-picker-and-queue]]). The management **Settings** screen writes them.
 *
 * Progressive enhancement: without this file the settings screen is a plain form whose controls do
 * nothing and the app uses the built-in defaults — nothing is load-bearing.
 *
 * It runs BEFORE `autocomplete.js` so a trimmed select is what the combobox is built from; `app.js`
 * also calls `__AA_SETTINGS__.apply` on an htmx swap, before it re-enhances, for the same reason.
 */
(function () {
  "use strict";

  var KEY = "aa-settings";

  /** The defaults, and the one place a new preference is declared. `invoicePickerScope` = "all" keeps
   *  every invoice reachable from the payment form (the owner's requirement); "open" trims the picker
   *  to unpaid invoices. */
  var DEFAULTS = {
    invoicePickerScope: "all",
  };

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function all() {
    var stored = load();
    var out = {};
    for (var k in DEFAULTS) out[k] = Object.prototype.hasOwnProperty.call(stored, k) ? stored[k] : DEFAULTS[k];
    return out;
  }

  function get(key) {
    var a = all();
    return Object.prototype.hasOwnProperty.call(a, key) ? a[key] : undefined;
  }

  function set(key, value) {
    var raw = load();
    raw[key] = value;
    try { localStorage.setItem(KEY, JSON.stringify(raw)); } catch (e) { /* private mode / quota */ }
    document.dispatchEvent(new CustomEvent("aa-settings:change", { detail: { key: key, value: value } }));
    apply(document);
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
    document.dispatchEvent(new CustomEvent("aa-settings:change", { detail: { key: "*" } }));
    apply(document);
  }

  /**
   * Apply the per-browser preferences to the current DOM.
   *
   * Only the invoice-picker scope is a DOM change: under "open", the paid invoices
   * (`option[data-paid="1"]`) are removed from the picker, so the searchable combobox is built from
   * the open set. Removal (not hiding) is deliberate — the combobox reads the select's options, and a
   * hidden option would still be offered. It is idempotent per page load and only ever REMOVES, so it
   * is safe to call again after an htmx swap.
   */
  function apply(root) {
    var scope = get("invoicePickerScope");
    if (scope !== "open") return;
    var picks = (root || document).querySelectorAll("select[data-invoice-picker]");
    for (var i = 0; i < picks.length; i++) {
      var paid = picks[i].querySelectorAll('option[data-paid="1"]');
      for (var j = paid.length - 1; j >= 0; j--) paid[j].remove();
    }
  }

  /** Hydrate the Settings form from the stored values and save on change. */
  function hydrateForm(root) {
    var form = (root || document).querySelector("[data-settings-form]");
    if (!form) return;
    form.querySelectorAll("[data-setting]").forEach(function (el) {
      var value = get(el.getAttribute("data-setting"));
      if (el.type === "checkbox") el.checked = value === true || value === "on" || value === "1";
      else if (value != null) el.value = String(value);
    });
    if (form.dataset.settingsBound === "1") return;
    form.dataset.settingsBound = "1";
    form.addEventListener("change", function (event) {
      var el = event.target.closest ? event.target.closest("[data-setting]") : null;
      if (!el) return;
      set(el.getAttribute("data-setting"), el.type === "checkbox" ? el.checked : el.value);
      var status = form.querySelector("[data-settings-saved]");
      if (status) {
        status.textContent = "Saved";
        window.setTimeout(function () { status.textContent = ""; }, 1500);
      }
    });
  }

  function init() {
    apply(document);
    hydrateForm(document);
  }

  window.__AA_SETTINGS__ = { get: get, set: set, reset: reset, all: all, apply: apply, hydrateForm: hydrateForm, defaults: DEFAULTS, KEY: KEY };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
