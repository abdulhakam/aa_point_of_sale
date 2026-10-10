/*
 * <aa-item-search> — the advanced item search behind the `000` code in the console's item field.
 *
 * The plan's `000` opens a dialog that filters ITEMS by COMPANY (an item's `category` is a company id;
 * `quick-create.js` and the legacy create-item form both treat it that way). The data already exists —
 * `refdb.js` holds `items` (with `category`, prices, box size) and `companies` — so this is a client
 * filter over the reference cache and no new server endpoint is needed. If the cache is absent the
 * control is simply empty; the item select's own list is unaffected, so nothing breaks.
 *
 * On pick it calls `selectItem` on the enclosing <aa-invoice-view>, which sets the item select and
 * advances focus — the same landing as choosing an item from the plain list.
 */
(function () {
  "use strict";

  function refdb() { return window.__AA_REFDB__; }

  var AAItemSearch = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      var self = this;
      this._company = this.querySelector("[data-is-company]");
      this._query = this.querySelector("[data-is-query]");
      this._results = this.querySelector("[data-is-results]");
      if (this._company) this._company.addEventListener("change", function () { self._render(); });
      if (this._query) {
        this._query.addEventListener("input", function () { self._render(); });
        this._query.addEventListener("keydown", function (e) { if (e.key === "Escape") self._close(); });
      }
      // The refdb reference cache is often not ready when this element upgrades (it loads after the
      // components), so render now AND again when the cache resolves — otherwise the dialog shows
      // "No items match" forever on a page whose data arrived a moment later.
      var r = refdb();
      if (r && r.ready && typeof r.ready.then === "function") r.ready.then(function () { self._render(); });
      // Also re-render each time the dialog opens, so a later refdb change is reflected.
      var host = this._modalHost();
      if (host && window.MutationObserver) {
        new MutationObserver(function () { if (host.hasAttribute("open")) self._render(); }).observe(host, { attributes: true, attributeFilter: ["open"] });
      }
      this._render();
    }

    _modalHost() {
      var ov = this.closest(".aa-modal-overlay");
      return ov && ov.__aaHost;
    }

    _close() {
      var ov = this.closest(".aa-modal-overlay");
      var host = ov && ov.__aaHost;
      if (host && host.close) host.close();
    }

    _items() {
      var r = refdb();
      return r && typeof r.get === "function" ? r.get("items") : [];
    }

    _companies() {
      var r = refdb();
      return r && typeof r.get === "function" ? r.get("companies") : [];
    }

    _render() {
      if (!this._results) return;
      var companies = this._companies();
      if (this._company && this._company.options.length <= 1) {
        for (var c = 0; c < companies.length; c++) {
          var opt = document.createElement("option");
          opt.value = String(companies[c].id);
          opt.textContent = String(companies[c].name ?? companies[c].id);
          this._company.appendChild(opt);
        }
      }
      var companyId = this._company ? this._company.value : "";
      var needle = this._query ? String(this._query.value || "").toLowerCase().trim() : "";
      var items = this._items().filter(function (it) {
        if (companyId && String(it.category || "") !== companyId) return false;
        if (needle && String(it.name || "").toLowerCase().indexOf(needle) === -1) return false;
        return true;
      }).slice(0, 100);

      var html = "";
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        html += '<tr>'
          + '<td data-label="Item" data-lead>' + escapeHtml(String(it.name ?? "")) + '</td>'
          + '<td class="right" data-label="Stock">' + escapeHtml(String(it.stock ?? "")) + '</td>'
          + '<td class="right" data-label="Sale">' + escapeHtml(String(it.sale_price ?? "")) + '</td>'
          + '<td><button class="btn primary" type="button" data-is-choose="' + escapeAttr(String(it.id)) + '">Choose</button></td>'
          + '</tr>';
      }
      if (!html) html = '<tr><td class="empty" colspan="4">No items match.</td></tr>';
      this._results.innerHTML = html;

      var self = this;
      this._results.querySelectorAll("[data-is-choose]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          self._choose(btn.getAttribute("data-is-choose"));
        });
      });
    }

    _choose(id) {
      var view = this.closest("aa-invoice-view") || document.querySelector("aa-invoice-view");
      var item = null;
      var items = this._items();
      for (var i = 0; i < items.length; i++) if (String(items[i].id) === String(id)) { item = items[i]; break; }
      if (view && typeof view.selectItem === "function") view.selectItem(id, item);
      this._close();
    }
  };

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  if (window.customElements && !customElements.get("aa-item-search")) {
    customElements.define("aa-item-search", AAItemSearch);
  }
})();
