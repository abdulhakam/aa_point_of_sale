/*
 * refdb-create — make the combobox's "Create …" panel insert a row without a reload.
 *
 * The panel is a submittable part of the invoice form: without JavaScript, "Create party" /
 * "Create item" submit the invoice and the create rides in that POST
 * ([[quick-create-rides-in-the-form-that-needed-it]]). With JavaScript and the refdb cache present,
 * this file instead POSTs `/quick-create`, puts the returned row into the cache, and selects it in
 * the control that opened the panel — so the new party or item is usable at once, with no page load
 * and no closing/reopening of the dropdown ([[reference-lists-come-from-indexeddb]]).
 *
 * IT FALLS BACK, LOUDLY ONLY TO THE SERVER. If the fetch fails, or the cache is absent, the panel
 * submits the form the old way, so the create is never lost. Nothing here is required for the page
 * to work.
 */
(function () {
  "use strict";

  function panelOf(button) {
    return button.closest ? button.closest(".qc") : null;
  }

  /** The panel's own named controls, as a urlencoded body — the same fields the form would post. */
  function bodyFor(panel, kind) {
    var params = new URLSearchParams();
    params.set("kind", kind);
    var fields = panel.querySelectorAll("input, select");
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      if (!el.name) continue;
      if (el.type === "checkbox") { if (el.checked) params.set(el.name, el.value || "on"); continue; }
      params.set(el.name, el.value);
    }
    return params.toString();
  }

  function closePanel(panel) {
    // The control owns the panel's open/close state (required-handover, inert-when-closed, the input
    // text). Escape is its documented close gesture, so this reuses it rather than reaching into the
    // control's internals — the panel's keydown listener does the rest.
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  }

  function create(button, event) {
    var panel = panelOf(button);
    if (!panel) return false;
    var kind = panel.id === "qc-item" ? "item" : "party";
    var refdb = window.__AA_REFDB__;
    if (!refdb || typeof refdb.upsert !== "function") return false;

    event.preventDefault();

    var nameField = panel.querySelector('[name$="_name"]');
    if (nameField && !String(nameField.value || "").trim()) {
      // Let the browser complain about the required field the control set, rather than posting an
      // empty name and getting a 400 back.
      button.removeAttribute("data-qc-create");
      button.click();
      return true;
    }

    button.disabled = true;
    // Once the server answers 2xx the row EXISTS. A later client failure (a broken response body, an
    // IndexedDB error in upsert) must not fall back to the form, or the create would happen twice —
    // `/quick-create` is a plain INSERT with no idempotency key. So the fallback is gated on the
    // create NOT having happened, which is only known before a 2xx response.
    var committed = false;
    fetch("/quick-create", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      credentials: "same-origin",
      body: bodyFor(panel, kind),
    })
      .then(function (response) {
        if (!response.ok) throw new Error("quick-create " + response.status);
        committed = true;
        return response.json();
      })
      .then(function (result) {
        return refdb.upsert(result.table, result.row).then(function () {
          // The control that OPENED the panel is the one to select the new row in. On the invoice grid
          // every row's item select points at the same panel, so the first match from
          // `querySelector` would put a newly created item into whichever row happens to be first;
          // `autocomplete.js` records the opener on the panel instead.
          var select = panel.__aaSelect || document.querySelector('select[data-create="#' + panel.id + '"]');
          if (select) {
            select.value = result.id;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
          if (nameField) nameField.value = "";
          closePanel(panel);
        });
      })
      .catch(function () {
        // The row exists; the cache/DOM update failed. Leave it for the next sync rather than
        // resubmitting, and close the panel so the operator is not stuck.
        if (committed) { closePanel(panel); return; }
        // The create did not happen — the server path still works, so hand the click back to the form
        // and nothing typed is lost.
        button.removeAttribute("data-qc-create");
        button.click();
      })
      .then(function () { button.disabled = false; });
    return true;
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var button = target && target.closest ? target.closest("[data-qc-create]") : null;
    if (button) create(button, event);
  });
})();
