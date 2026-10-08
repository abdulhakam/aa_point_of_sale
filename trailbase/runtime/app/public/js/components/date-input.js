/*
 * <aa-date-input> — the legacy Mantine `DateInput` look, as a native custom element.
 *
 * WHY THIS EXISTS. The report filter and the entry screens used a native `<input type="date">`, whose
 * rendered control and calendar button belong to the browser, so the control looked like the browser
 * and not like the app ([[ui-parity-discrepancies-2026-10-05]] item D). The legacy shows
 * `April 11, 2026` — a plain field with no visible glyph. This element renders that field while
 * keeping a real `<input type="date">` underneath as the submitted value.
 *
 * ── Rules it will not break ──────────────────────────────────────────────────────────────────────────
 *
 * 1. **The native `<input type="date">` stays in the form.** It keeps its `name`, `value`, `required`
 *    and `disabled`. The element only REPLACES the appearance; the form posts exactly what it posted
 *    before. This is the same contract `autocomplete.js` keeps for `<select>`.
 * 2. **Without JavaScript the page is unchanged.** If the element is never upgraded (no JS), it is an
 *    unknown inline element wrapping a normal visible date input — a working control.
 * 3. **Picking reuses the browser's own calendar.** `showPicker()` is called on the native input, so
 *    there is no second date-picker implementation to keep correct; the fallback reveals the native
 *    input for the one interaction if `showPicker` is unavailable.
 *
 * Author it as `<aa-date-input><input type="date" name="…" value="…"></aa-date-input>`; the element
 * adopts that child. No attribute is required.
 */
(function () {
  "use strict";

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /** `2026-04-11` -> `April 11, 2026`; anything else is returned as-is (blank stays blank). */
  function format(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    return MONTHS[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1];
  }

  /**
   * Parse the field's text back to an ISO date, or "" if it is not a date. Accepts the element's own
   * `April 11, 2026`, an ISO `2026-04-11`, and anything the browser can parse unambiguously.
   */
  function parse(text) {
    var s = (text || "").trim();
    if (!s) return "";
    var mdy = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
    if (mdy) {
      var mi = MONTHS.indexOf(mdy[1].charAt(0).toUpperCase() + mdy[1].slice(1).toLowerCase());
      if (mi > -1) return mdy[3] + "-" + pad(mi + 1) + "-" + pad(Number(mdy[2]));
    }
    var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (iso) return iso[1] + "-" + pad(Number(iso[2])) + "-" + pad(Number(iso[3]));
    var t = Date.parse(s);
    if (!isNaN(t)) { var d = new Date(t); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    return "";
  }

  var AADateInput = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      var native = this.querySelector('input[type="date"]');
      if (!native) return;
      this._ready = true;
      this._native = native;
      native.classList.add("aa-date-native");
      // The visible text field is the control the keyboard uses, so the native input is taken out of
      // the tab order and of the hotkey layer's field set — otherwise `Alt+ArrowDown` walked from the
      // text field onto an invisible input and appeared to do nothing.
      native.tabIndex = -1;

      var text = document.createElement("input");
      text.type = "text";
      text.className = "aa-date-text";
      text.value = format(native.value);
      text.autocomplete = "off";
      text.spellcheck = false;
      text.setAttribute("aria-label", native.getAttribute("aria-label") ||
        native.getAttribute("name") || "date");
      if (native.disabled) text.disabled = true;
      // The text field is the visible control; the native input stays the form value. A required native
      // input is what the form validates, so the mirror must not add a second required field.
      this.insertBefore(text, native);

      var self = this;
      var open = function () { self._open(); };
      text.addEventListener("click", open);
      text.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); open(); }
      });
      text.addEventListener("change", function () {
        var iso = parse(text.value);
        if (iso) { native.value = iso; text.value = format(iso); native.dispatchEvent(new Event("change", { bubbles: true })); }
        else { text.value = format(native.value); }
      });
      native.addEventListener("input", function () { text.value = format(native.value); });
      native.addEventListener("change", function () { text.value = format(native.value); });
      native.addEventListener("blur", function () { self.classList.remove("aa-date-show"); });
    }

    /** Open the browser's own calendar for the native input; fall back to revealing it. */
    _open() {
      var n = this._native;
      if (!n || n.disabled) return;
      try {
        if (typeof n.showPicker === "function") { n.showPicker(); return; }
      } catch (e) { /* not allowed in this context; fall through */ }
      this.classList.add("aa-date-show");
      n.focus();
    }
  };

  if (window.customElements && !customElements.get("aa-date-input")) {
    customElements.define("aa-date-input", AADateInput);
  }
})();
