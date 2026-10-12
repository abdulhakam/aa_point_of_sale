/*
 * <aa-invoice-view> — the keyboard invoice console's controller.
 *
 * See .kilo/plans/1791600000000-invoice-view-keyboard-redesign.md and
 * vault/decisions/invoice-console-keyboard-state-machine.md. This element owns the state machine and
 * the focus choreography over SERVER-RENDERED markup; every action it accelerates also has a visible
 * control in the template, so the screen works with no JavaScript and with a mouse.
 *
 * The magic codes are consumed ONLY as exact values in the relevant field:
 *   0    (picker)  exit to the dashboard
 *   000  (item)    advanced search — handled by autocomplete.js (`data-adv-search`), which dispatches
 *                  `adv-search`; this element opens the <aa-item-search> dialog
 *   999  (item)    finish: invoice discounts -> payment dialog
 * `up` edits the line above (a recorded dead-key area, so it is claimed only inside this surface).
 */
(function () {
  "use strict";

  function isField(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
  }

  /** The native select behind an autocomplete wrapper, or the element itself if it is a select. */
  function selectOf(el) {
    if (!el) return null;
    if (el.tagName === "SELECT") return el;
    var wrap = el.closest && el.closest(".ac");
    return wrap ? wrap.querySelector("select") : null;
  }

  /**
   * The field NAME of whatever has focus. A searchable select is enhanced into a combobox, so the
   * focused element is the visible `.ac-input`, which has NO `name` — reading `e.target.name` alone
   * made every walk past an enhanced field a no-op (found by tools/invoice-console-check.mjs: Enter on
   * the party combobox did not advance to the date). Fall back to the wrapped select's name.
   */
  function fieldName(el) {
    if (!el) return "";
    if (el.name) return el.name;
    var sel = selectOf(el);
    return sel && sel.name ? sel.name : "";
  }

  var AAInvoiceView = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this._type = Number(this.getAttribute("data-type"));
      this._canWrite = this.getAttribute("data-can-write") === "1";
      this._state = this.getAttribute("data-state") || "pick";
      var self = this;
      this._onKey = function (e) { self._key(e); };
      // Capture phase: the codes (0/999) must be seen before autocomplete's own Enter handling.
      this.addEventListener("keydown", this._onKey, true);
      var picker = this._picker();
      if (picker) {
        picker.addEventListener("change", function () { self._pickerChanged(); });
      }
      var item = this._item();
      if (item) {
        item.addEventListener("change", function () { self._fillFromItem(); });
        item.addEventListener("adv-search", function (e) { self._openItemSearch(e); });
      }
      var lineForm = this._lineForm();
      if (lineForm) {
        // The line walk (carton -> unit -> free -> discounts) submits the form on the last field.
        lineForm.addEventListener("keydown", function (e) { self._lineWalkKey(e, lineForm); });
      }
      var create = this._createForm();
      if (create) {
        // The NEW walk (booker -> party -> date -> submit). Without this the header fields enabled but
        // Enter never advanced — found by driving the real UI.
        create.addEventListener("keydown", function (e) { self._walkKey(e, create); });
      }
      var header = this.querySelector("[data-console-header]");
      if (header) {
        // The 999 finish walk: discount_1 -> discount_2 -> discount_rs -> payment dialog. Without
        // this, Enter in a discount field submitted the header form instead.
        header.addEventListener("keydown", function (e) { self._discountWalkKey(e, header); });
      }
      this._wireLineCells();
      this._focusStart();
    }

    disconnectedCallback() {
      if (this._onKey) this.removeEventListener("keydown", this._onKey, true);
    }

    /* ── elements ─────────────────────────────────────────────────────────── */
    _picker() { return this.querySelector("[data-console-picker]"); }
    _createForm() { return this.querySelector("[data-console-create]"); }
    _lineForm() { return this.querySelector("[data-console-lineform]"); }
    _item() { return this.querySelector("[data-console-item]"); }
    _modal(id) { return this.querySelector(id); }

    /** Focus the control the state starts on: the picker (State 0) or the blank line's item. */
    _focusStart() {
      var self = this;
      var el = this._state === "pick" ? this._picker() : this._item();
      if (!el) return;
      // `autocomplete.js` enhances the searchable control AFTER this element upgrades (script order),
      // and moving the native select into its combobox wrapper blurs it — so wait for the wrapper
      // before focusing, or focus lands on a hidden select and is immediately lost.
      var tries = 0;
      (function attempt() {
        var ac = el.closest && el.closest(".ac");
        if (el.hasAttribute("data-searchable") && !ac && tries < 40) {
          tries++;
          requestAnimationFrame(attempt);
          return;
        }
        focusControl(el);
      })();
    }

    /* ── the picker: NEW / an invoice / 0 ─────────────────────────────────── */
    _pickerChanged() {
      var picker = this._picker();
      if (!picker) return;
      if (picker.value === "") {
        this._newWalk();
      } else {
        // Selecting an invoice opens it in the console with the action dialog up. The dialog lives in
        // the loaded branch (it needs the invoice), so a picked invoice navigates there.
        window.location.assign("/invoices/new?type=" + this._type + "&invoice=" + encodeURIComponent(picker.value) + "&actions=1");
      }
    }

    _openActions() {
      var m = this._modal("#console-actions");
      if (m && m.open) m.open();
    }

    /** State 1 -> 4: enable the header fields and focus the first one. Sale starts at the booker. */
    _newWalk() {
      var form = this._createForm();
      if (!form) return;
      // Enable every non-hidden, non-readonly control the walk owns — including the internals of
      // `<aa-date-input>` (its visible field and the native date parts), which a name-only loop missed.
      var fields = form.querySelectorAll("select, input");
      for (var i = 0; i < fields.length; i++) {
        var el = fields[i];
        if (el.readOnly || el.type === "hidden") continue;
        el.disabled = false;
      }
      var first = form.querySelector('select[name="booker"]') || form.querySelector('select[name="party"]') || form.querySelector('input[name="dated"]');
      if (first) focusControl(first);
    }

    _openActions() {
      var m = this._modal("#console-actions");
      if (m && m.open) m.open();
    }

    /* ── the NEW walk: booker -> party -> date -> submit ──────────────────── */
    _createKey(e) { this._walkKey(e, this._createForm()); }

    /* ── line cells (`up`-to-edit) ────────────────────────────────────────── */
    _wireLineCells() {
      var self = this;
      this.querySelectorAll("[data-console-line] .cell").forEach(function (input) {
        input.addEventListener("keydown", function (e) { self._cellKey(e, input); });
        // Mark the row dirty so Enter only PATCHes a row that actually changed (the plan's rule).
        input.addEventListener("input", function () {
          var row = input.closest("[data-console-line]");
          if (row) row.__aaDirty = true;
        });
      });
    }

    /* ── the one key handler (capture) ────────────────────────────────────── */
    _key(e) {
      if (e.isComposing || e.defaultPrevented) return;
      var target = e.target;
      var sel = selectOf(target);
      var value = target && target.value !== undefined ? String(target.value) : "";

      // Picker: Enter starts. `NEW` (value "") begins the walk; an invoice opens the action dialog.
      // Claimed only when the combobox list is CLOSED, so Enter still chooses a highlighted option.
      if (e.key === "Enter" && this._state === "pick") {
        var picker = this._picker();
        var ac = target && target.closest && target.closest(".ac");
        var isPicker = picker && (target === picker || (ac && ac.querySelector("select") === picker));
        if (isPicker && !(ac && ac.classList.contains("is-open"))) {
          e.preventDefault(); e.stopPropagation();
          if (!picker.value) this._newWalk(); else this._openActions();
          return;
        }
      }

      // 999 at the item field: finish -> invoice discounts -> payment dialog.
      if (e.key === "Enter" && sel && sel.hasAttribute("data-console-item") && value.trim() === "999") {
        e.preventDefault(); e.stopPropagation();
        this._finish();
        return;
      }
      // Enter on the item field once an item is chosen advances the walk to carton size. The
      // autocomplete would otherwise reopen its list on Enter; claiming it only when the list is
      // CLOSED and a value is set leaves choosing (list open) to the combobox untouched.
      if (e.key === "Enter" && sel && sel.hasAttribute("data-console-item") && sel.value) {
        var wrap = target && target.closest && target.closest(".ac");
        if (wrap && !wrap.classList.contains("is-open")) {
          var form = this._lineForm();
          var box = form && form.querySelector('[data-console-box]');
          if (box) { e.preventDefault(); e.stopPropagation(); focusControl(box); return; }
        }
      }
      // 0 in the picker: exit to the dashboard. Only from an empty picker value, so searching for a
      // real invoice numbered 0 remains possible (the option, not the keystroke, is chosen). The
      // picker's VALUE is the test, not the visible text: the combobox input shows the blank option's
      // label ("NEW"), so reading the input text made `0` type into the box instead of exiting (found
      // by tools/invoice-console-check.mjs).
      if (e.key === "0" && this._state === "pick") {
        var p = this._picker();
        var pInput = target && target.closest && target.closest(".ac");
        var pickValue = sel ? String(sel.value) : value;
        if (p && (target === p || pInput) && pickValue.trim() === "") {
          e.preventDefault(); e.stopPropagation();
          window.location.assign("/dashboard");
          return;
        }
      }
      // `up` inside the invoice surface edits: focus the qty of this line, or of the one above.
      if (e.key === "ArrowUp" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && isField(target)) {
        if (target.classList && target.classList.contains("cell")) {
          e.preventDefault();
          this._upFromCell(target, e);
          return;
        }
      }
    }

    /** `up` on a qty cell -> the qty of the line above; `up` on any other cell -> this line's qty. */
    _upFromCell(input, e) {
      var row = input.closest("[data-console-line]");
      if (!row) return;
      var qty = row.querySelector('.cell[name="qty"]');
      if (input.name !== "qty" && qty) { focusControl(qty); return; }
      var prev = row.previousElementSibling;
      while (prev && !prev.hasAttribute("data-console-line")) prev = prev.previousElementSibling;
      if (prev) {
        var pq = prev.querySelector('.cell[name="qty"]');
        if (pq) focusControl(pq);
      }
      // Topmost line: nothing.
    }

    _cellKey(e, input) {
      if (e.key !== "Enter" || e.isComposing) return;
      e.preventDefault();
      var row = input.closest("[data-console-line]");
      this._commitRow(row);
    }

    /**
     * Commit one existing line: PATCH the canonical JSON endpoint only when a value changed (the plan's
     * "update the line only if changed"), then move to the next line's qty. The server recomputes the
     * amounts; the whole console re-renders on the next htmx write, and the component re-inits.
     */
    _commitRow(row) {
      if (!row) return;
      var id = row.getAttribute("data-line");
      if (!id || !this._canWrite) return;
      var val = function (name) {
        var el = row.querySelector('.cell[name="' + name + '"]');
        return el ? el.value : "";
      };
      var line = {
        qty: val("qty"), price: val("price"),
        discount_1: val("discount_1"), discount_2: val("discount_2"),
        discount_rs: val("discount_rs"), scheme: val("scheme"), cost_price: "0",
      };
      if (!row.__aaDirty) return;
      row.__aaDirty = false;
      var self = this;
      fetch("/invoice/" + this._invoiceId() + "/line/" + id, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(line),
      })
        .then(function () { self._refresh(); })
        .catch(function () { /* the next write re-renders; a failed PATCH just leaves the row as-is */ });
    }

    /* ── the loaded line walk ─────────────────────────────────────────────── */
    _lineWalkKey(e, form) {
      if (e.key !== "Enter" || e.isComposing) return;
      var order = ["item", "box_size_qty", "qty", "scheme", "price", "discount_1", "discount_2", "discount_rs"];
      var target = e.target;
      var name = fieldName(target);
      var idx = order.indexOf(name);
      if (idx === -1) return;
      // The item field's own Enter is the combobox's (choose); once chosen, focus stays and the walk
      // continues from carton. A plain select (few items) advances directly.
      e.preventDefault();
      var next = order[idx + 1];
      if (!next) { form.requestSubmit ? form.requestSubmit() : form.submit(); return; }
      var el = form.querySelector('[name="' + next + '"]');
      if (el) focusControl(el);
    }

    /** Choosing an item fills carton size, prices from the option's own data; qty defaults 0/1/0. */
    _fillFromItem() {
      var form = this._lineForm();
      var item = this._item();
      if (!form || !item) return;
      var opt = item.options[item.selectedIndex];
      if (!opt || !opt.value) return;
      var box = form.querySelector('[data-console-box]');
      var price = form.querySelector('[data-console-price]');
      var qty = form.querySelector('[data-console-qty]');
      var free = form.querySelector('[data-console-free]');
      if (box) box.value = opt.dataset.box !== undefined && opt.dataset.box !== "" ? opt.dataset.box : "0";
      if (price && (!price.value || Number(price.value) === 0)) price.value = opt.dataset.price || "0";
      // 0 must be a real value, never blank (the plan's default is carton 0, unit 1, free 0).
      if (qty && (qty.value === "" || qty.value === null)) qty.value = "1";
      if (free && free.value === "") free.value = "0";
    }

    /* ── 000 advanced item search ─────────────────────────────────────────── */
    _openItemSearch() {
      var m = this._modal("#console-itemsearch");
      if (m && m.open) m.open();
    }

    /** Called by <aa-item-search> when an item is picked: put it in the item select and advance. */
    selectItem(id, item) {
      var select = this._item();
      if (!select) return;
      var found = null;
      for (var i = 0; i < select.options.length; i++) if (select.options[i].value === String(id)) { found = select.options[i]; break; }
      if (!found) {
        found = document.createElement("option");
        found.value = String(id);
        found.textContent = item && item.name ? item.name : String(id);
        if (item) {
          if (item.sale_price !== undefined) found.dataset.price = String(item.sale_price);
          if (item.cost_price !== undefined) found.dataset.cost = String(item.cost_price);
          if (item.box_size_qty !== undefined) found.dataset.box = String(item.box_size_qty);
        }
        select.appendChild(found);
      }
      select.value = String(id);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      focusControl(select);
    }

    /* ── 999 finish: discounts -> payment dialog ──────────────────────────── */
    _finish() {
      var header = this.querySelector("[data-console-header]");
      var first = header && header.querySelector('input[name="discount_1"]');
      if (first) { focusControl(first); return; }
      this._openPay();
    }

    /** Enter through discount_1 -> discount_2 -> discount_rs -> the payment dialog. */
    _discountWalkKey(e, header) {
      if (e.key !== "Enter" || e.isComposing) return;
      var order = ["discount_1", "discount_2", "discount_rs"];
      var name = fieldName(e.target);
      var idx = order.indexOf(name);
      if (idx === -1) return;
      e.preventDefault();
      var next = order[idx + 1];
      if (!next) { this._openPay(); return; }
      var el = header.querySelector('input[name="' + next + '"]');
      if (el) focusControl(el);
    }

    _openPay() {
      var m = this._modal("#console-pay");
      if (m && m.open) m.open();
    }

    /* ── upgrade the surface from a server fragment ───────────────────────── */
    _refresh() {
      // A console fragment swap is the canonical way to refresh; when fetch is used (PATCH) re-fetch
      // the console's own URL as a fragment through htmx so the server re-renders identically.
      if (window.htmx && typeof window.htmx.ajax === "function") {
        var url = "/invoices/new?type=" + this._type + "&invoice=" + encodeURIComponent(this._invoiceId());
        window.htmx.ajax("GET", url, { target: "#app-main", swap: "innerHTML", headers: { "X-Requested-With": "XMLHttpRequest" } });
      } else {
        window.location.reload();
      }
    }

    _invoiceId() { return this.getAttribute("data-invoice") || ""; }

    _walkKey(e, form) {
      if (!form || e.key !== "Enter" || e.isComposing) return;
      var order = [];
      if (form.querySelector('select[name="booker"]')) order.push("booker");
      if (form.querySelector('select[name="party"]')) order.push("party");
      order.push("dated");
      var name = fieldName(e.target);
      var idx = order.indexOf(name);
      if (idx === -1) return;
      e.preventDefault();
      var next = order[idx + 1];
      if (!next) { form.requestSubmit ? form.requestSubmit() : form.submit(); return; }
      var el = form.querySelector('[name="' + next + '"]');
      if (el) focusControl(el);
    }
  };

  function focusControl(el) {
    if (!el) return;
    // A select may be a combobox whose real control is the visible input, not the hidden native select.
    if (el.tagName === "SELECT") {
      var ac = el.closest && el.closest(".ac");
      var input = ac && ac.querySelector(".ac-input");
      if (input) el = input;
    }
    try {
      el.focus();
      if (el.select && el.tagName === "INPUT") el.select();
    } catch (e) { /* not focusable */ }
  }

  /** Focus a select through its combobox input when it has one; a native select otherwise. */
  function focusSelect(select) { focusControl(select); }

  if (window.customElements && !customElements.get("aa-invoice-view")) {
    customElements.define("aa-invoice-view", AAInvoiceView);
  }

  // Exposed for a harness and for any re-init after an htmx swap of the console.
  window.__AA_INVOICE_VIEW__ = { version: 1 };
})();
