/*
 * <aa-live-time> — the two-line clock in the app header (time over date), ticking every second.
 *
 * WHY. The header clock used to be painted by `app.js` on a 30 s interval, so it showed seconds that
 * only changed every half minute — a clock that looked live and was not. This is a component so the
 * timer belongs to the thing it updates: it starts on connect, stops on disconnect, and pauses while
 * the tab is hidden (there is no point repainting a clock nobody can see).
 *
 * Light DOM, styled by the global `.header-clock` (`app.css`): `white-space: pre-line` turns the
 * `\n` between time and date into the second line. No shadow root — the app's look is one global
 * stylesheet shared by every component, and parity is measured on that markup.
 */
(function () {
  "use strict";

  var TIME = { hour: "2-digit", minute: "2-digit", second: "2-digit" };
  var DATE = { day: "2-digit", month: "short", year: "numeric" };

  var AALiveTime = class extends HTMLElement {
    connectedCallback() {
      if (this._timer) return;
      var self = this;
      this._tick = function () {
        var now = new Date();
        self.textContent =
          now.toLocaleTimeString(undefined, TIME) +
          "\n" +
          now.toLocaleDateString(undefined, DATE);
      };
      this._onVis = function () {
        if (document.hidden) {
          clearInterval(self._timer);
          self._timer = null;
        } else if (!self._timer) {
          self._tick();
          self._timer = setInterval(self._tick, 1000);
        }
      };
      this._tick();
      this._timer = setInterval(this._tick, 1000);
      document.addEventListener("visibilitychange", this._onVis);
    }

    disconnectedCallback() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (this._onVis) document.removeEventListener("visibilitychange", this._onVis);
    }
  };

  if (window.customElements && !customElements.get("aa-live-time")) {
    customElements.define("aa-live-time", AALiveTime);
  }
})();
