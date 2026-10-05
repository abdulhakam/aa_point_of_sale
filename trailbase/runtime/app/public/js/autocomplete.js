/*
 * Searchable autocomplete for the long `<select>`s — one control, not a select beside a text box.
 *
 * WHY THIS EXISTS. Every `select[data-searchable]` used to get a separate `filter…` input injected
 * beside it (`enhanceSelects`, since removed). Two controls where the operator expected one, which is
 * what "it looks bad" meant. Legacy's Mantine `Autocomplete` is the behaviour to match; its appearance
 * is deliberately not the target ([[parity-is-functional-not-visual]]).
 *
 * ── Four rules this file will not break ───────────────────────────────────────────────────────────────
 *
 * 1. **THE NATIVE `<select>` STAYS IN THE FORM.** It is hidden visually, never detached, and it keeps
 *    the `name`. So the form posts exactly what it posted before, with no JavaScript involved in the
 *    submission. Every integration point that listens for `change` on the select — the invoice grid's
 *    item handler that fills price and cost — keeps working, because choosing an option *dispatches a
 *    real `change` event* on the select rather than setting a value silently.
 *
 * 2. **Without JavaScript the page is a normal form with normal selects.** Nothing here is required to
 *    read or submit a page ([[runtime-js-minimal-file-authoring-contract]]).
 *
 * 3. **A value that is not on the list is never submitted.** Free text is allowed while typing, but on
 *    blur anything that does not correspond to an option resets the input to the select's own label and
 *    clears the select. A party name typed into an invoice must not become that party's id.
 *
 * 4. **Small selects are left alone.** Below `MIN_OPTIONS` options a native select is genuinely the
 *    better control — a combobox that filters four bookers is theatre. Only the selects that are
 *    genuinely hard to pick from get one, which is also why the report filter row is not 7 comboboxes.
 *
 * Keyboard: type to filter · ↑↓ move · Enter choose · Tab choose and move on · Esc close, then blur.
 * That last one matters — it is the same two-stage Escape the global layer uses, so one key press
 * means the same thing everywhere ([[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]).
 */
(function () {
  "use strict";

  /** A native select beats a combobox until the list is genuinely long. Measured on this app's own
   *  data: 4 bookers, 7 sections, 15 companies, 59 areas, 207 items, 942 parties. */
  var MIN_OPTIONS = 12;

  function enhance(select) {
    if (select.multiple || select.dataset.acReady === "1") return;
    var options = [];
    for (var i = 0; i < select.options.length; i++) {
      var o = select.options[i];
      if (o.value === "") continue;
      options.push({ value: o.value, label: (o.textContent || "").replace(/\s+/g, " ").trim() });
    }
    if (options.length < MIN_OPTIONS) return;
    select.dataset.acReady = "1";

    var wrap = document.createElement("span");
    wrap.className = "ac";
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    var input = document.createElement("input");
    input.type = "text";
    input.className = "ac-input";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-label", select.getAttribute("aria-label") || select.name || "Search");

    var caret = document.createElement("span");
    caret.className = "ac-caret";
    caret.setAttribute("aria-hidden", "true");

    var list = document.createElement("ul");
    list.className = "ac-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    wrap.appendChild(input);
    wrap.appendChild(caret);
    wrap.appendChild(list);
    // The select keeps `name` and stays in the form; only its appearance is replaced. Rule 1.
    select.classList.add("ac-native");

    var listId = "ac-list-" + Math.random().toString(36).slice(2, 9);
    list.id = listId;
    input.setAttribute("aria-controls", listId);

    /** What is shown while nothing is selected — the first option reads as the current value. */
    function currentLabel() {
      var opt = select.options[select.selectedIndex];
      if (opt && opt.value !== "") return (opt.textContent || "").replace(/\s+/g, " ").trim();
      return "";
    }

    var filtered = options.slice();
    var cursor = -1;
    var open = false;

    function score(entry, needle) {
      var hay = entry.label.toLowerCase();
      var at = hay.indexOf(needle);
      if (at === -1) return -1;
      // A prefix is a better answer than a substring, and an exact match is better than both.
      return at === 0 ? 0 : 1 + at;
    }

    /** The most options rendered at once. 943 parties is fine as an array and absurd as DOM. */
    var MAX_RENDERED = 50;

    function filter() {
      var needle = input.value.toLowerCase().trim();
      if (!needle) {
        // An empty query opens a *short* list, not the whole table. Rendering 943 <li> for the 943
        // parties is a page's worth of DOM per open, and the invoice grid has 37 of these.
        filtered = options.slice(0, MAX_RENDERED);
        return;
      }
      var scored = [];
      for (var i = 0; i < options.length; i++) {
        var s = score(options[i], needle);
        if (s !== -1) scored.push({ entry: options[i], score: s });
      }
      scored.sort(function (a, b) { return a.score - b.score || a.entry.label.localeCompare(b.entry.label); });
      filtered = scored.slice(0, MAX_RENDERED).map(function (r) { return r.entry; });
    }

    /** Redraw for the CURRENT query. Called on every keystroke, open or not. */
    function refresh() {
      filter();
      cursor = filtered.length ? 0 : -1;
      paint();
      highlight();
    }

    function paint() {
      if (!filtered.length) {
        list.innerHTML = '<li class="ac-empty" role="presentation">No match</li>';
        return;
      }
      var html = "";
      for (var i = 0; i < filtered.length; i++) {
        html += '<li class="ac-option" role="option" id="' + listId + "-" + i + '" aria-selected="false" data-i="' + i + '"></li>';
      }
      list.innerHTML = html;
      for (var j = 0; j < list.children.length; j++) {
        list.children[j].textContent = filtered[j].label;
      }
    }

    function highlight() {
      var items = list.querySelectorAll(".ac-option");
      for (var i = 0; i < items.length; i++) {
        var on = i === cursor;
        items[i].classList.toggle("is-active", on);
        items[i].setAttribute("aria-selected", String(on));
        if (on) {
          input.setAttribute("aria-activedescendant", items[i].id);
          if (items[i].scrollIntoView) items[i].scrollIntoView({ block: "nearest" });
        }
      }
    }

    function show() {
      // ⚠️ This must NOT return early when already open. It did, once, and the consequence was that the
      // list opened on the first character and then never narrowed again: `k` matched almost every
      // party, so "kar" left 943 options on screen and the operator was typing into a control that was
      // not listening. Typing calls `refresh()` for exactly this reason — open-or-not is not its
      // question, "does the list match what I typed" is.
      refresh();
      if (open) return;
      list.hidden = false;
      wrap.classList.add("is-open");
      input.setAttribute("aria-expanded", "true");
      open = true;
    }

    function hide() {
      if (!open) return;
      list.hidden = true;
      wrap.classList.remove("is-open");
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      open = false;
      cursor = -1;
    }

    /** Choose an entry. Dispatches `change` on the select so existing handlers run — rule 1. */
    function choose(entry) {
      if (!entry) return false;
      input.value = entry.label;
      var changed = select.value !== entry.value;
      select.value = entry.value;
      hide();
      if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    function commitTyped() {
      // Rule 3: only an option that exists may be submitted.
      var needle = input.value.toLowerCase().trim();
      var match = null;
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].label.toLowerCase() === needle) { match = filtered[i]; break; }
      }
      if (match) return choose(match);
      input.value = currentLabel();
      if (select.value === "") return false;
      return false;
    }

    input.addEventListener("focus", function () { input.select(); show(); });
    input.addEventListener("click", function () { show(); });
    input.addEventListener("input", show);

    input.addEventListener("keydown", function (event) {
      if (event.isComposing) return;
      var items = list.querySelectorAll(".ac-option");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!open) { show(); return; }
        cursor = items.length ? Math.min(cursor + 1, items.length - 1) : -1;
        highlight();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) { show(); return; }
        cursor = items.length ? Math.max(cursor - 1, 0) : -1;
        highlight();
      } else if (event.key === "Enter") {
        // In a form, Enter would submit. Choosing must win, or the operator cannot pick with the
        // keyboard at all — so the default is prevented whenever a choice is on offer.
        if (open && cursor >= 0 && filtered[cursor]) {
          event.preventDefault();
          choose(filtered[cursor]);
        } else if (!open) {
          event.preventDefault();
          show();
        }
      } else if (event.key === "Tab") {
        // Tab is a choice: tabbing past a combobox must not silently discard what was highlighted.
        if (open && cursor >= 0 && filtered[cursor]) choose(filtered[cursor]);
      } else if (event.key === "Escape") {
        if (open) { event.preventDefault(); event.stopPropagation(); hide(); }
        else { input.value = currentLabel(); input.blur(); }
      } else if (event.key === "Home" && open) {
        event.preventDefault();
        cursor = 0;
        highlight();
      } else if (event.key === "End" && open) {
        event.preventDefault();
        cursor = items.length - 1;
        highlight();
      }
    });

    input.addEventListener("blur", function () {
      // A click on an option must not read as a blur, or the value is wiped as it is chosen.
      if (wrap.contains(document.activeElement) && document.activeElement !== input) return;
      window.setTimeout(function () {
        if (wrap.contains(document.activeElement)) return;
        hide();
        commitTyped();
      }, 0);
    });

    list.addEventListener("mousedown", function (event) {
      var li = event.target.closest && event.target.closest(".ac-option");
      if (!li) return;
      event.preventDefault();
      choose(filtered[Number(li.getAttribute("data-i"))]);
      input.focus();
    });

    // Clicking the caret opens the list without focusing the text cursor mid-word.
    caret.addEventListener("mousedown", function (event) {
      event.preventDefault();
      if (open) { hide(); input.blur(); } else { input.focus(); show(); }
    });

    input.value = currentLabel();
    select.addEventListener("change", function () { input.value = currentLabel(); });

    // If something else in the app changes the select (an item pick filling a form), keep the text true.
    wrap.addEventListener("ac:sync", function () { input.value = currentLabel(); });
  }

  function init() {
    var list = document.querySelectorAll("select[data-searchable]");
    for (var i = 0; i < list.length; i++) {
      try { enhance(list[i]); } catch (error) { console.warn("autocomplete: " + (list[i].name || "select") + " left as a native select", error); }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
