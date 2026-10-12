/*
 * <aa-modal> — a Mantine `Modal`, as a native custom element, for the dialogs the legacy opens.
 *
 * WHY. `stockreport` and `difference` open their filters in a centered "Filter Data" dialog
 * ([[ui-parity-discrepancies-2026-10-08]] §3), and the guest showed the same fields inline. A dialog
 * that reopens is a thing several screens need, so it is a component rather than a per-page script
 * ([[features-as-native-web-components]]).
 *
 * ── Contract ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Author it with the dialog's content as its children:
 *
 *     <aa-modal open title="Filter Data">
 *       <form method="get" action="…">…</form>
 *     </aa-modal>
 *
 * - **Without JavaScript the children are a normal inline block**, so the form still works. The
 *   element only *moves* them into an overlay when it upgrades — never invents them.
 * - **`open` shows it.** Removing `open` hides it; the X, Escape and a click on the overlay all do
 *   that. The attribute is the whole state, so the server can decide whether a dialog starts open.
 * - The content is moved, not copied, so any `name`/`value` in the light DOM is submitted unchanged.
 */
(function () {
  "use strict";

  // Mantine's modal overlay is `rgba(0,0,0,.6)`; the dialog is a centered white card. The close glyph
  // is the same X the legacy draws in the top-right of the header.
  var X = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  var AAModal = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;

      var overlay = document.createElement("div");
      overlay.className = "aa-modal-overlay";
      var dialog = document.createElement("div");
      dialog.className = "aa-modal-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      if (this.getAttribute("title")) dialog.setAttribute("aria-label", this.getAttribute("title"));

      var header = document.createElement("div");
      header.className = "aa-modal-header";
      // The legacy dialog's title is an `<h2>` (its `Filter Data` heading is measured as one), so a
      // screen reader and the parity extractor see the same structure.
      var title = document.createElement("h2");
      title.className = "aa-modal-title";
      title.textContent = this.getAttribute("title") || "";
      var close = document.createElement("button");
      close.type = "button";
      close.className = "aa-modal-close";
      close.setAttribute("aria-label", "Close");
      close.innerHTML = X;
      header.appendChild(title);
      header.appendChild(close);

      var body = document.createElement("div");
      body.className = "aa-modal-body";
      // Move the authored children into the dialog body — never rebuild them, so form state survives.
      while (this.firstChild) body.appendChild(this.firstChild);

      dialog.appendChild(header);
      dialog.appendChild(body);
      overlay.appendChild(dialog);
      // The authored children are MOVED out of this element into the overlay, so `closest("aa-modal")`
      // from inside the dialog is null. Tag the overlay with its host so anything inside the dialog can
      // find the modal it belongs to (autocomplete's create dialog, `[data-modal-close]`).
      overlay.__aaHost = this;
      this._overlay = overlay;
      document.body.appendChild(overlay);

      var self = this;
      close.addEventListener("click", function () { self.close(); });
      overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) self.close(); });
      this._onKey = function (e) { if (e.key === "Escape" && self.hasAttribute("open")) self.close(); };
      document.addEventListener("keydown", this._onKey);

      this._sync();
    }

    disconnectedCallback() {
      if (this._onKey) document.removeEventListener("keydown", this._onKey);
      // The overlay is appended to <body>, OUTSIDE this element, so removing the host — which is what
      // an htmx swap of the page does — would otherwise leave the overlay behind: a dialog that
      // outlives the page it belonged to, and a backdrop that keeps blocking clicks if it was open.
      // Take it with the host. `_ready` stays true: a node htmx recreates comes back as fresh markup
      // with its own children, so re-initialising an already-emptied host would show a blank dialog.
      if (this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
    }

    static get observedAttributes() { return ["open"]; }
    attributeChangedCallback() { this._sync(); }

    _sync() {
      if (!this._overlay) return;
      this._overlay.style.display = this.hasAttribute("open") ? "" : "none";
    }

    /** Hide the dialog. The element stays in the DOM so it can be reopened. */
    close() { this.removeAttribute("open"); }

    /** Show the dialog. */
    open() { this.setAttribute("open", ""); }
  };

  if (window.customElements && !customElements.get("aa-modal")) {
    customElements.define("aa-modal", AAModal);
  }

  // A `[data-modal-open="#id"]` control opens the named dialog; `[data-modal-close]` inside closes it.
  // Declarative so a template wires a trigger with an attribute and no inline script.
  document.addEventListener("click", function (e) {
    var opener = e.target.closest && e.target.closest("[data-modal-open]");
    if (opener) {
      var m = document.querySelector(opener.getAttribute("data-modal-open"));
      if (m && m.open) { e.preventDefault(); m.open(); }
      return;
    }
    var closer = e.target.closest && e.target.closest("[data-modal-close]");
    if (closer) {
      // The content lives in the overlay, not inside the `<aa-modal>`, so the host is found through the
      // overlay rather than `closest("aa-modal")`.
      var ov = closer.closest(".aa-modal-overlay");
      var host = (ov && ov.__aaHost) || closer.closest("aa-modal");
      if (host) { e.preventDefault(); host.close(); }
    }
  });
})();
