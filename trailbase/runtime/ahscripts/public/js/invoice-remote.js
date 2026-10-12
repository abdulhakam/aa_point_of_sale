/*
 * Server-side invoice-number search for a searchable select that opts in with `data-invoice-remote`.
 *
 * The console's invoice-# picker can hold 12,000+ invoices of one type, so the server renders only the
 * newest 200 inline (the console re-renders on every line write, so a full inline list is not
 * affordable). This replaces those options with server-side number matches as the operator types:
 *
 *   data-invoice-remote="/data/invoices/search?type=1"
 *
 * The endpoint returns `{ invoices: [{ id, invoiceNo, partyName }] }` for a digit fragment; this writes
 * them into the select and fires `refdb:select`, which `autocomplete.js` listens for, so its combobox
 * re-reads the options and refreshes its open list for the current query. With no digits the resting
 * (server-rendered) list is restored. Progressive enhancement: without this script the picker still
 * shows the newest 200 and works as a plain combobox.
 */
(function () {
  "use strict";

  var DEBOUNCE_MS = 180;

  function optionFragment(list) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < list.length; i++) {
      var inv = list[i];
      var o = document.createElement("option");
      o.value = inv.id;
      // Same shape as the server-rendered options (`lib/invoices.js` consoleView): number · party ·
      // date · total, so a searched option reads identically to a resting one.
      o.textContent = "#" + inv.invoiceNo +
        " \u00b7 " + (inv.partyName || "No party") +
        (inv.dated ? " \u00b7 " + inv.dated : "") +
        (inv.totalText ? " \u00b7 " + inv.totalText : "");
      frag.appendChild(o);
    }
    return frag;
  }

  function rebuild(select, list) {
    var keep = select.value;
    var blank = select.querySelector('option[value=""]');
    blank = blank ? blank.cloneNode(true) : (function () { var o = document.createElement("option"); o.value = ""; return o; })();
    var frag = document.createDocumentFragment();
    frag.appendChild(blank);
    frag.appendChild(optionFragment(list || []));
    select.textContent = "";
    select.appendChild(frag);
    if (keep) select.value = keep;
  }

  function enhance(select) {
    if (select.__aaRemote) return;
    var url = select.getAttribute("data-invoice-remote");
    if (!url) return;

    var tries = 0;
    (function wait() {
      // The combobox is built by autocomplete.js AFTER this element exists; drive its visible input.
      var ac = select.closest && select.closest(".ac");
      var input = ac && ac.querySelector(".ac-input");
      if (!input) { if (tries++ < 60) return requestAnimationFrame(wait); return; }
      select.__aaRemote = true;

      var restingHTML = null; // captured lazily, before the first search replaces the options
      var seq = 0;
      var timer = null;
      var lastDigits = null;

      function sync() {
        // No detail => autocomplete re-reads the select and, if its list is open, refreshes it.
        select.dispatchEvent(new Event("refdb:select", { bubbles: true }));
      }

      function run(digits) {
        var mine = ++seq;
        var sep = url.indexOf("?") >= 0 ? "&" : "?";
        fetch(url + sep + "q=" + encodeURIComponent(digits), { headers: { accept: "application/json" }, credentials: "same-origin" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (p) {
            if (mine !== seq) return; // a newer keystroke superseded this response
            if (restingHTML === null) restingHTML = select.innerHTML;
            rebuild(select, (p && p.invoices) || []);
            // The endpoint matched on the DIGITS in the box; `autocomplete.js` filters the replacement
            // options on the box's raw text. If the operator typed a non-digit (e.g. `#3000`), the two
            // needles disagree and the control showed "No match" for a row the server had just returned.
            // Normalise the box to the digits that were matched, before telling the combobox to re-read.
            if (input.value !== digits) input.value = digits;
            sync();
          })
          .catch(function () { /* keep the previous list; the operator can retype */ });
      }

      input.addEventListener("input", function () {
        var text = String(input.value || "");
        // The input holds the selected option's text at rest; only a real query should search.
        var selectedText = select.selectedIndex >= 0 ? select.options[select.selectedIndex].textContent : "";
        if (text === selectedText) return;
        var digits = text.replace(/[^0-9]/g, "");
        if (digits === lastDigits) return;
        lastDigits = digits;
        clearTimeout(timer);
        if (!digits) {
          // Invalidate any in-flight search before restoring the resting list, or a late response
          // passes the `mine !== seq` guard below and re-applies stale matches over it.
          seq++;
          if (restingHTML !== null) { select.innerHTML = restingHTML; sync(); }
          return;
        }
        timer = setTimeout(function () { run(digits); }, DEBOUNCE_MS);
      });
    })();
  }

  function enhanceAll(root) {
    (root || document).querySelectorAll("select[data-invoice-remote]").forEach(enhance);
  }

  document.addEventListener("htmx:afterSwap", function (event) { enhanceAll(event.target || document); });
  document.addEventListener("DOMContentLoaded", function () { enhanceAll(document); });
  if (document.readyState !== "loading") enhanceAll(document);
  window.__AA_INVOICE_REMOTE__ = { enhanceAll: enhanceAll };
})();
