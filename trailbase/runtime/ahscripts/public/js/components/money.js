/*
 * <aa-money> — a money/rate number input, as a native custom element.
 *
 * WHY. Two rules govern an editable money field, and both were being kept by hand at every site:
 *
 *  1. **An amount is 2 dp** ([[money-is-2dp-everywhere]]): a value that is summed, transported or
 *     displayed must be exactly two decimals. Typing `1.5` into a payment amount should read `1.50`.
 *  2. **A rate is NOT an amount, and must never be rounded to 2 dp.** A unit price or cost is a rate:
 *     the legacy data holds `114.583333` and `58.3333` (a price of 1375/12). Rendering those into an
 *     editable input as `114.58` silently rewrites the ledger on save — the exact defect recorded in
 *     [[minimise-client-side-calculation]] point 3 and decided in [[client-side-live-recalculation]]:
 *     *the editable input carries the stored value; `money()` is for display columns.*
 *
 * The historical-precision footgun is why this component has two modes and why the default is the
 * safe amount mode, not a blanket 2 dp round:
 *
 *     <aa-money>              <input type="number" name="amount"  value="…"></aa-money>   amount, 2 dp
 *     <aa-money rate>         <input type="number" name="price"   value="114.583333"></aa-money>
 *     <aa-money decimals="3"> … </aa-money>                                                an amount at 3 dp
 *
 * ── Rules it will not break ──────────────────────────────────────────────────────────────────────────
 *
 * 1. **The native `<input type="number">` stays the form control.** It keeps its `name`, `value`,
 *    `required` and `disabled`; the element changes only how the value is normalised, never what is
 *    submitted. This is the `autocomplete.js`/`<aa-date-input>` contract; unlike them there is no
 *    second visible control, so the keyboard layer (`hotkeys.js fields()`) is untouched.
 * 2. **Without JavaScript the page is unchanged.** An un-upgraded `<aa-money>` is an unknown inline
 *    element wrapping a normal number input — a working control. A `rate` gets `step="any"` from the
 *    template (and from here, defensively), so the no-JS submit of a fractional rate is not blocked.
 * 3. **A rate is never rounded.** In `rate` mode there is no listener at all; the value is left exactly
 *    as stored.
 *
 * Amount mode normalises through `round2`, the app's single round-half-up rule (`compute/format.js`),
 * NOT `Number.prototype.toFixed` — the two disagree at half-cent boundaries (`125.505`: `round2` 125.51
 * vs `toFixed` 125.50), and since the component rewrites the value before submit, the rule that runs
 * here is the rule that gets stored.
 */
(function () {
  "use strict";

  var PAISA = 100;
  var EPSILON = Number.EPSILON;

  /** The app's round-half-up rule (`compute/format.js`), done in integers so float cannot drift. */
  function round2(v) {
    return Math.round((Number(v) + EPSILON) * PAISA) / PAISA;
  }

  function isRate(el) {
    return el.hasAttribute("rate");
  }

  function decimals(el) {
    // `Number(getAttribute())` would read an ABSENT attribute as 0 — `Number(null) === 0` — so a bare
    // `<aa-money>` silently became a 0-decimal field (`1.5` -> `2`). Check presence first.
    if (!el.hasAttribute("decimals")) return 2;
    var d = Number(el.getAttribute("decimals"));
    return Number.isFinite(d) && d >= 0 && d <= 6 ? Math.floor(d) : 2;
  }

  var AAMoney = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      var input = this.querySelector('input[type="number"]');
      if (!input) return;
      this._ready = true;
      this._input = input;

      // The decimal keypad on a phone. Harmless on desktop; the value is numeric either way.
      if (!input.hasAttribute("inputmode")) input.setAttribute("inputmode", "decimal");

      if (isRate(this)) {
        // A rate is never normalised, so it needs no listener — and no per-row cost in a grid that
        // re-renders on every htmx swap. The template also renders `step="any"`; setting it here is a
        // belt-and-braces for a caller that forgets.
        input.step = "any";
        return;
      }

      input.step = decimals(this) === 2 ? "0.01" : "any";

      var self = this;
      // `blur` is the moment an operator has finished a cell; `change` also fires from the number
      // spinner and programmatic sets. Normalising on both is idempotent.
      this._onNormalise = function () { self._normalise(); };
      input.addEventListener("blur", this._onNormalise);
      input.addEventListener("change", this._onNormalise);
    }

    disconnectedCallback() {
      if (!this._input || !this._onNormalise) return;
      this._input.removeEventListener("blur", this._onNormalise);
      this._input.removeEventListener("change", this._onNormalise);
    }

    _normalise() {
      var input = this._input;
      if (!input || input.disabled) return;
      var raw = input.value;
      if (raw === "" || raw === null || raw === undefined) return;
      var n = Number(raw);
      if (!Number.isFinite(n)) return;
      var d = decimals(this);
      // `round2` is the app's rule; `toFixed` alone rounds the binary double and disagrees at
      // half-cent boundaries. For a non-default decimal count, round2 does not apply.
      var rounded = d === 2 ? round2(n) : n;
      input.value = rounded.toFixed(d);
    }
  };

  if (window.customElements && !customElements.get("aa-money")) {
    customElements.define("aa-money", AAMoney);
  }
})();
