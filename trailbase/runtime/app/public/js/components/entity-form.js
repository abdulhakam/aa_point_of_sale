/*
 * <aa-entity-form> — wraps a server-rendered <form> and gives it three behaviours every write form
 * wants, once, instead of at each site:
 *
 *   1. an **inline error surface** for client-side validation (the mirrored `required`), instead of
 *      the browser's inconsistent native bubble;
 *   2. an **inline error surface** for a server response htmx refused to swap (a bare 4xx/5xx has no
 *      fragment to show, which is the failure the write routes work around in hand-rolled HTML);
 *   3. **disabled-during-flight**: the submit controls are disabled while the request is open, so an
 *      impatient second click cannot POST twice.
 *
 * ── Contract ─────────────────────────────────────────────────────────────────────────────────────────
 *
 *     <aa-entity-form>
 *       <form method="post" hx-boost="true" …> … </form>
 *     </aa-entity-form>
 *
 * - **Without JavaScript the children are an ordinary working form.** The element only adds
 *   listeners; it never invents or reorders the markup.
 * - **Validation stays server-authoritative.** This mirrors `required` for UX only, the same rule as
 *   `app/lib/management.js missingRequired` — it never decides whether a write is valid.
 * - **It never interferes with a valid submission.** Validation runs on the submit intent (a click on
 *   a submit control, or a `submit` event) and only stops the event when a field the server would
 *   reject anyway is empty. In-flight disabling is driven by htmx's own events and filtered to requests
 *   this form started, so a navigation elsewhere on the page is unaffected.
 *
 * ⚠️ Why the submit intent is intercepted on `click` too. The browser runs constraint validation and,
 * when a field fails, does **not** dispatch `submit` — so a `submit`-only listener never sees an
 * invalid form, and the `invalid` event is not delivered to an ancestor's capture listener either
 * (verified in Chrome). Listening for the submit control's `click` and validating there is the only
 * place the feedback can be produced reliably.
 */
(function () {
  "use strict";

  var SUBMIT_SELECTOR = 'button[type="submit"], input[type="submit"], input[type="image"]';

  /** A short, safe message from an error response body (JSON `error`/`message`, else stripped text). */
  function errorText(xhr) {
    var raw = "";
    try { raw = xhr.responseText || ""; } catch (e) { raw = ""; }
    if (!raw) return xhr && xhr.status ? "The server refused the request (" + xhr.status + ")." : "The request failed.";
    try {
      var json = JSON.parse(raw);
      if (json && typeof json === "object") {
        if (json.error) return String(json.error);
        if (json.message) return String(json.message);
      }
    } catch (e) { /* not JSON */ }
    var text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text.slice(0, 240) || ("The server refused the request (" + (xhr.status || "") + ").");
  }

  /** The visible block a message should sit in: the `.field` a control is nested in, else its parent. */
  function fieldBox(control) {
    return control.closest(".field") || control.parentNode;
  }

  /** True for a control the browser would treat as submitting this form. */
  function isSubmitControl(node) {
    if (!node || !node.closest) return false;
    var button = node.closest("button, input");
    if (!button) return false;
    if (button.tagName === "BUTTON") return (button.getAttribute("type") || "submit").toLowerCase() === "submit";
    var type = (button.getAttribute("type") || "").toLowerCase();
    return type === "submit" || type === "image";
  }

  var AAEntityForm = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      var form = this.querySelector("form");
      if (!form) return;
      this._ready = true;
      this._form = form;

      this._onClick = this._onClick.bind(this);
      this._onSubmit = this._onSubmit.bind(this);
      this._onFieldInput = this._onFieldInput.bind(this);
      this._onBeforeRequest = this._onBeforeRequest.bind(this);
      this._onSettle = this._onSettle.bind(this);

      form.addEventListener("click", this._onClick, true);
      form.addEventListener("submit", this._onSubmit, true);
      form.addEventListener("input", this._onFieldInput, true);
      form.addEventListener("change", this._onFieldInput, true);

      // htmx dispatches on the triggering element (the form) and it bubbles to the host.
      this.addEventListener("htmx:beforeRequest", this._onBeforeRequest);
      this.addEventListener("htmx:afterRequest", this._onSettle);
      this.addEventListener("htmx:responseError", this._onSettle);
      this.addEventListener("htmx:sendError", this._onSettle);
    }

    disconnectedCallback() {
      if (!this._form) return;
      this._form.removeEventListener("click", this._onClick, true);
      this._form.removeEventListener("submit", this._onSubmit, true);
      this._form.removeEventListener("input", this._onFieldInput, true);
      this._form.removeEventListener("change", this._onFieldInput, true);
      this.removeEventListener("htmx:beforeRequest", this._onBeforeRequest);
      this.removeEventListener("htmx:afterRequest", this._onSettle);
      this.removeEventListener("htmx:responseError", this._onSettle);
      this.removeEventListener("htmx:sendError", this._onSettle);
    }

    /** True when an htmx event was caused by this form (not a navigation elsewhere on the page). */
    _owns(event) {
      var elt = event.detail && event.detail.elt;
      return !!elt && (elt === this._form || this._form.contains(elt));
    }

    _setBusy(busy) {
      var form = this._form;
      // `aria-busy` is the single state hook; `app.css` styles the submit controls from it. (A class
      // here would be a second, unstyled marker.)
      form.toggleAttribute("aria-busy", busy);
      var buttons = form.querySelectorAll(SUBMIT_SELECTOR);
      for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        if (busy) {
          // Remember what WE disabled, so a button another rule disabled is not re-enabled on settle.
          button.dataset.aaWasDisabled = button.disabled ? "1" : "";
          button.disabled = true;
        } else if (button.dataset.aaWasDisabled === "") {
          button.disabled = false;
          delete button.dataset.aaWasDisabled;
        }
      }
    }

    _clearMessages() {
      var stale = this._form.querySelectorAll(".field-error");
      for (var i = 0; i < stale.length; i++) stale[i].remove();
      var marked = this._form.querySelectorAll("[aria-invalid]");
      for (var j = 0; j < marked.length; j++) marked[j].removeAttribute("aria-invalid");
      var region = this._form.querySelector(".form-error");
      if (region) region.remove();
    }

    /** A click on a submit control is a submit intent: validate before the browser or htmx acts on it. */
    _onClick(event) {
      if (!isSubmitControl(event.target) || !this._form.contains(event.target.closest("button, input"))) return;
      this._gate(event);
    }

    /** Enter in a text field submits without a click; validate the same way. */
    _onSubmit(event) {
      this._gate(event);
    }

    /**
     * Clear stale messages, then stop the event if any control the server would also reject is invalid.
     * Runs for a valid form too (it clears and, for a non-htmx form, marks busy).
     */
    _gate(event) {
      this._clearMessages();
      var form = this._form;
      var controls = form.querySelectorAll("input, select, textarea");
      var invalid = [];
      for (var i = 0; i < controls.length; i++) {
        var control = controls[i];
        if (!control.willValidate || control.disabled || control.validity.valid) continue;
        invalid.push(control);
      }

      if (invalid.length) {
        // Stop the click/submit before the browser navigates or htmx issues the request; our own
        // message is the surface, so the native bubble is not wanted.
        event.preventDefault();
        event.stopImmediatePropagation();
        for (var j = 0; j < invalid.length; j++) this._markInvalid(invalid[j]);
        return;
      }

      // Valid: disable now for a plain form too, so a double click cannot fire two navigations; a
      // boosted form is covered by htmx:beforeRequest.
      if (!form.hasAttribute("hx-boost") && !form.hasAttribute("hx-post")) this._setBusy(true);
    }

    _markInvalid(control) {
      control.setAttribute("aria-invalid", "true");
      var box = fieldBox(control);
      if (!box || box.querySelector(".field-error")) return;
      var message = document.createElement("span");
      message.className = "field-error";
      message.setAttribute("role", "alert");
      message.textContent = control.validationMessage || "This field is required.";
      box.appendChild(message);
    }

    /** Drop one control's error as soon as its value changes — the operator is fixing it. */
    _onFieldInput(event) {
      var control = event.target;
      if (!control || !control.matches || !control.matches("input, select, textarea")) return;
      var box = fieldBox(control);
      if (box) {
        var message = box.querySelector(".field-error");
        if (message) message.remove();
      }
      control.removeAttribute("aria-invalid");
    }

    _onBeforeRequest(event) {
      if (this._owns(event)) this._setBusy(true);
    }

    _onSettle(event) {
      if (!this._owns(event)) return;
      this._setBusy(false);
      if (event.type === "htmx:responseError" || event.type === "htmx:sendError") this._showServerError(event);
    }

    _showServerError(event) {
      var region = this._form.querySelector(".form-error");
      if (!region) {
        region = document.createElement("div");
        region.className = "form-error";
        region.setAttribute("role", "alert");
        this._form.insertBefore(region, this._form.firstChild);
      }
      region.textContent = errorText(event.detail && event.detail.xhr);
    }
  };

  if (window.customElements && !customElements.get("aa-entity-form")) {
    customElements.define("aa-entity-form", AAEntityForm);
  }
})();
