/*
 * <aa-flash> — the write-feedback banner, as a native custom element.
 *
 * WHY. Every write answers with a fragment that carries a `.flash` region (see `partials/flash.html.jinja`
 * and [[htmx-navigation-with-html-fragments]]), so the message already appears in place with no
 * reload. What it lacks is a lifetime: on a boosted navigation the banner from the previous action
 * stays until the next action replaces it. This element gives it one — a successful message clears
 * itself, an error message stays long enough to read and can be dismissed — without changing how the
 * message is rendered or what a gate that reads `.flash` sees.
 *
 * ── Contract ─────────────────────────────────────────────────────────────────────────────────────────
 *
 *     <aa-flash><div class="flash ok">Saved</div></aa-flash>
 *
 * - **Without JavaScript the banner stays exactly as the server rendered it** — the element is an
 *   unknown inline wrapper and nothing is removed. A page with no JS keeps its feedback.
 * - **It never invents the message.** It only adds a close control and a timer to the child the
 *   server sent, and it keeps the `.flash <kind>` markup so every existing selector and gate still
 *   finds it while it is on screen.
 */
(function () {
  "use strict";

  // An error deserves longer than a confirmation, and neither should vanish mid-read: the timer pauses
  // while the pointer is over the banner.
  var LIFETIME = { ok: 4000, warn: 7000, error: 8000 };
  var FADE_MS = 300;

  var X = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  var AAFlash = class extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      var banner = this.querySelector(".flash");
      if (!banner) return;
      this._ready = true;
      this._banner = banner;

      // `<div class="flash ok error …">` — the kind is whichever class is neither `flash` nor a button.
      var kinds = ["ok", "warn", "error"];
      var kind = kinds.filter(function (k) { return banner.classList.contains(k); })[0] || "ok";

      var close = document.createElement("button");
      close.type = "button";
      close.className = "flash-close";
      close.setAttribute("aria-label", "Dismiss");
      close.innerHTML = X;
      banner.appendChild(close);

      var self = this;
      close.addEventListener("click", function () { self.dismiss(); });
      this._onEnter = function () { self._pause(); };
      this._onLeave = function () { self._resume(); };
      banner.addEventListener("mouseenter", this._onEnter);
      banner.addEventListener("mouseleave", this._onLeave);
      this._delay = LIFETIME[kind] || LIFETIME.ok;
      this._start();
    }

    disconnectedCallback() {
      this._pause();
      if (this._banner) {
        this._banner.removeEventListener("mouseenter", this._onEnter);
        this._banner.removeEventListener("mouseleave", this._onLeave);
      }
    }

    _start() {
      var self = this;
      this._timer = setTimeout(function () { self.dismiss(); }, this._delay);
    }

    _pause() {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    }

    _resume() {
      // Restart the full delay rather than the remainder: the operator is reading it now, and a
      // half-read banner that vanishes the instant the pointer leaves is worse than one that waits.
      if (this._banner && this._banner.parentNode) this._start();
    }

    /** Fade the banner out, then remove it. Idempotent. */
    dismiss() {
      this._pause();
      var banner = this._banner;
      if (!banner || !banner.parentNode) return;
      banner.classList.add("flash-out");
      setTimeout(function () {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
      }, FADE_MS);
    }
  };

  if (window.customElements && !customElements.get("aa-flash")) {
    customElements.define("aa-flash", AAFlash);
  }
})();
