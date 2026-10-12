/*
 * <aa-invoice-entry> — the invoice-entry screen's container element.
 *
 * WHY. The four invoice types are one table with a `type` code (0 purchase, 1 sale, 2 return,
 * 3 difference); there is no per-type table. The screen that adapts to the type is therefore built
 * **server-side** — `invoices.entryView()` renders the type's own party label, booker, original-invoice
 * and so on from the code. See [[components-consume-server-descriptors]]: a component must consume a
 * server descriptor, NEVER carry a client-side type→table switch. So this element does not branch on
 * `data-type` for data at all; the descriptor it *does* use is the item option's own data.
 *
 * What it owns is the one client behaviour that repeats on the entry screen: choosing an item fills
 * the line's price (and cost, where the form has the field) from the item's own data, unless the
 * operator already typed a number. That is the behaviour `app.js` `enhanceLineEditor()` used to hold;
 * it lives here now so it is declared by a tag in the template rather than applied to every
 * `form select[name="item"]` on the page — the grid's item cells keep their own richer version in
 * `enhanceGrid()` (they also drive a live recalculation and a qty-as display).
 *
 * ── Contract ─────────────────────────────────────────────────────────────────────────────────────────
 *
 *     <aa-invoice-entry data-type="{{ type }}" data-can-write="{{ … }}">
 *       … the entry screen (server-rendered) …
 *     </aa-invoice-entry>
 *
 * - **Without JavaScript the screen is unchanged.** The element adds a `change` listener; the form,
 *   the select and the price input are all the server's markup.
 * - `data-type` / `data-can-write` are carried as the server's descriptor for the screen. They are
 *   read for observability (a test can assert the screen's type) and are deliberately not used to
 *   choose a different data source, table or write path.
 */
(function () {
  "use strict";

  var AAInvoiceEntry = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      var selects = this.querySelectorAll('select[name="item"]');
      for (var i = 0; i < selects.length; i++) {
        // The grid has its own item handling (`enhanceGrid`), so leave those cells alone.
        if (selects[i].closest("[data-grid]")) continue;
        this._wireItem(selects[i]);
      }
    }

    /** The type code the server rendered this screen for. `null` when the descriptor is absent. */
    get invoiceType() {
      var raw = this.getAttribute("data-type");
      return raw === null || raw === "" ? null : Number(raw);
    }

    /** Whether the server granted this screen a writable lease. */
    get canWrite() {
      return this.getAttribute("data-can-write") === "1";
    }

    _wireItem(select) {
      var form = select.closest("form");
      if (!form) return;
      var price = form.querySelector('input[name="price"]');
      var cost = form.querySelector('input[name="cost_price"]');
      if (!price && !cost) return;

      var apply = function () {
        var option = select.options[select.selectedIndex];
        if (!option) return;
        // The operator's number always wins: fill only an empty or still-default price.
        if (price && option.dataset.price !== undefined && option.dataset.price !== "" &&
            (!price.value || Number(price.value) === 0)) {
          price.value = option.dataset.price;
        }
        if (cost && option.dataset.cost && !cost.value) cost.value = option.dataset.cost;
      };

      select.addEventListener("change", apply);
      // A preselected item (an item created in the quick-create panel and selected on the same submit)
      // is filled on load too, so the price the row will post is on screen before it is saved.
      apply();
    }
  };

  if (window.customElements && !customElements.get("aa-invoice-entry")) {
    customElements.define("aa-invoice-entry", AAInvoiceEntry);
  }
})();
