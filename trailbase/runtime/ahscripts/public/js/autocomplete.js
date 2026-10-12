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

  /**
   * Make a quick-create panel inert, or live.
   *
   * It has to run in two places, which is why it is not a line inside `panelClose`. The panel holds an
   * AREA combobox, and enhancing that select injects an input into the panel — after the party's own
   * `enhance()` has already walked the panel. Disabling from `enhance()` alone therefore left the
   * injected input enabled, and the assertion that every control in a closed panel is disabled failed
   * — which is the harness doing its job: the first draft only looked right.
   */
  function setPanelInert(panel, inert) {
    var fields = panel.querySelectorAll("input, select, button");
    for (var i = 0; i < fields.length; i++) fields[i].disabled = inert;
  }

  /** The select's own options as `{value,label}`, in document order, blanks dropped. */
  function readOptions(select) {
    var options = [];
    for (var i = 0; i < select.options.length; i++) {
      var o = select.options[i];
      if (o.value === "") continue;
      options.push({ value: o.value, label: (o.textContent || "").replace(/\s+/g, " ").trim() });
    }
    return options;
  }

  function enhance(select) {
    if (select.multiple || select.dataset.acReady === "1") return;
    var options = readOptions(select);
    // A console field can opt in with `data-force-combo`: its keyboard codes (999/000) need the
    // combobox's text input, which a native select does not provide. Everywhere else, a short list
    // stays a native select (rule 4).
    if (options.length < MIN_OPTIONS && !select.hasAttribute("data-force-combo")) return;
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

    /** What the control shows for the current selection. The blank option — legacy's `All` — reads as
     *  its own label rather than as an empty box, so a report filter with nothing chosen still says how
     *  it will behave ([[ui-parity-discrepancies-2026-10-08]]). */
    function currentLabel() {
      var opt = select.options[select.selectedIndex];
      if (!opt) return "";
      return (opt.textContent || "").replace(/\s+/g, " ").trim();
    }

    /**
     * What the operator has TYPED, as a query — the box at rest shows the current selection's label
     * (legacy's `All` / `No party`), and that label is not a query. Without this the resting box read
     * as a search for its own label: the open list filtered to nothing and offered a bogus
     * `Create "No party"` row instead of the rows a refdb insert had just added.
     */
    function typedQuery() {
      if (input.value === currentLabel()) return "";
      return input.value;
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

    /** The most options rendered at once. 943 parties is fine as an array and absurd as DOM. A control
     *  can raise its own cap with `data-ac-limit` (the console invoice-# picker asks for its whole
     *  200-row server list, so opening it browses the full set rather than the first 50). */
    var MAX_RENDERED = Math.max(1, Number(select.getAttribute("data-ac-limit")) || 50);

    function filter() {
      var needle = typedQuery().toLowerCase().trim();
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

    /**
     * What the list should show for the current query: the matches, and — when the text names something
     * that is not on the list — one more row offering to create it.
     *
     * The row is an entry in the same array the arrows walk, not a decoration appended to the DOM. An
     * earlier draft painted it as a separate element outside `filtered`; that made it invisible to
     * ArrowDown and Enter, so it could only be clicked, which for a keyboard-first app is worse than not
     * having it.
     */
    function shown() {
      var rows = filtered.slice();
      var adv = advancedRow();
      if (adv) {
        // The exact magic code is an action, not a name to create: suppress the "Create …" row so
        // Enter opens the advanced-search dialog and cannot make an item literally named `000`.
        rows.push(adv);
        return rows;
      }
      var name = creatableName();
      if (name) rows.push({ create: true, label: name });
      return rows;
    }

    /**
     * The synthetic "Advanced search" row, appended the same way the create row is.
     *
     * ⚠️ The magic code `000` is consumed ONLY as the exact typed value in a select that opted in with
     * `data-adv-search`. This is deliberate ([[invoice-console-keyboard-state-machine]]): the item list
     * can legitimately contain an item named/printed `000`, and that item must still be selectable from
     * the list below this row. Because the row is an entry in the same array the arrows walk and not a
     * DOM decoration, `Enter` picks it exactly like any option.
     */
    function advancedRow() {
      if (!select.hasAttribute("data-adv-search")) return null;
      if (typedQuery().replace(/\s+/g, " ").trim() !== "000") return null;
      return { adv: true, label: "Advanced search…" };
    }

    /** Redraw for the CURRENT query. Called on every keystroke, open or not. */
    function refresh() {
      filter();
      cursor = shown().length ? 0 : -1;
      paint();
      highlight();
    }

    function paint() {
      var rows = shown();
      if (!rows.length) {
        list.innerHTML = '<li class="ac-empty" role="presentation">No match</li>';
        return;
      }
      var html = "";
      for (var i = 0; i < rows.length; i++) {
        var cls = "ac-option" + (rows[i].create ? " ac-create" : (rows[i].adv ? " ac-adv" : ""));
        html += '<li class="' + cls + '" role="option" id="' + listId + "-" + i + '" aria-selected="false" data-i="' + i + '"></li>';
      }
      list.innerHTML = html;
      for (var j = 0; j < list.children.length; j++) {
        // The create row reads as the action it is, not as a row of data — the quotes are the hint that
        // the name is a name to make, and the ellipsis that something follows. The advanced-search row
        // is already a plain action label.
        list.children[j].textContent = rows[j].create ? "Create \u201c" + rows[j].label + "\u201d\u2026" : rows[j].label;
      }
      var last = rows[rows.length - 1];
      if (last && (last.create || last.adv)) list.children[rows.length - 1].classList.add("is-last");
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
      // The create row is an action, not a value: it must never reach `select.value`, or rule 3's
      // promise ("a value that is not on the list is never submitted") would be broken by the very
      // control that offers to make one.
      if (entry.create) return openPanel(entry.label);
      // The advanced-search row is likewise an action, not a value. It announces itself on the select
      // and the screen that opted in (`data-adv-search`) opens its own dialog. The select keeps
      // whatever it held, so nothing invalid is submitted if the dialog is cancelled.
      if (entry.adv) {
        hide();
        select.dispatchEvent(new CustomEvent("adv-search", { bubbles: true, detail: { query: typedQuery() } }));
        return true;
      }
      input.value = entry.label;
      var changed = select.value !== entry.value;
      select.value = entry.value;
      hide();
      if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    function commitTyped() {
      // Rule 3: only an option that exists may be submitted. `typedQuery` so the resting box (showing
      // the current selection's label) is not committed as if that label had been typed.
      var needle = typedQuery().toLowerCase().trim();
      var match = null;
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].create) continue;
        if (filtered[i].label.toLowerCase() === needle) { match = filtered[i]; break; }
      }
      if (match) return choose(match);
      input.value = currentLabel();
      if (select.value === "") return false;
      return false;
    }

    /* ───────────────────────────────────────────────────────────────────── creating from here ─────

       When the typed text names something that is not on the list, the last row of the list becomes
       "Create …". Choosing it opens the panel the select points at with `data-create` — a block of
       fields rendered by `views/partials/quick-create.html.jinja` INSIDE the same form. The create therefore
       travels in the form's own submit: the invoice header, or the line being added, is saved with it.
       That is the whole reason it is not a fetch: nothing has to be re-rendered and nothing typed is
       lost ([[runtime-js-minimal-file-authoring-contract]]).

       ⚠️ The panel's controls are DISABLED while it is closed. Hidden is not enough — a hidden input is
       still submitted, so a "Save header" after an abandoned create would have carried the typed name
       into the database. Disabling is what makes "party_new_name is non-empty" a true signal, with no
       marker field for anyone to forget to clear. */
    var panel = null;
    var panelSelector = select.getAttribute("data-create");
    if (panelSelector) panel = document.querySelector(panelSelector);

    /** The name the panel would create, or "" when the list already contains exactly that. */
    function creatableName() {
      if (!panel) return "";
      var needle = typedQuery().replace(/\s+/g, " ").trim();
      if (!needle) return "";
      for (var i = 0; i < options.length; i++) {
        if (options[i].label.toLowerCase() === needle.toLowerCase()) return "";
      }
      return needle;
    }

    /** The `<aa-modal>` that carries this panel, if the panel is authored inside one (the legacy
     *  create dialog). Opening/closing the dialog is what shows/hides it; the panel itself is only
     *  unhidden so its controls are visible and enabled inside the dialog.
     *
     *  ⚠️ `<aa-modal>` MOVES its children into an overlay on `document.body`, so `closest("aa-modal")`
     *  from the panel is null; the overlay is tagged with its host (`__aaHost`) instead. */
    function panelModal() {
      if (!panel || !panel.closest) return null;
      var ov = panel.closest(".aa-modal-overlay");
      if (ov && ov.__aaHost) return ov.__aaHost;
      return panel.closest("aa-modal");
    }

    function openPanel(name) {
      if (!panel) return false;
      hide();
      // Remember WHICH control opened this panel. Several selects can point at one panel (every row of
      // the invoice grid points at `#qc-item`), so "the select to fill in" cannot be found by
      // `document.querySelector` after the fact — `refdb-create.js` reads this instead.
      panel.__aaSelect = select;
      panel.hidden = false;
      panel.classList.add("is-open");
      setPanelInert(panel, false);
      var modal = panelModal();
      if (modal && modal.open) modal.open();
      var nameField = panel.querySelector('[name$="_name"]');
      if (nameField) {
        nameField.required = true;
        nameField.value = name;
        // Inside a dialog the panel is shown by `<aa-modal>` in the same tick, so focus is deferred one
        // frame — focusing an element that was `display:none` a moment ago can silently fail.
        if (modal) {
          requestAnimationFrame(function () {
            nameField.focus();
            if (nameField.select) nameField.select();
          });
        } else {
          nameField.focus();
          if (nameField.select) nameField.select();
        }
      }
      // The "create" answer stands in for the select's own value, so a select the browser would insist
      // on (the line form's item is `required`) must not block the submit that creates it. Restored on
      // close, so the no-JS requirement is intact and an abandoned panel cannot save an empty line.
      if (select.required) {
        select.dataset.acWasRequired = "1";
        select.required = false;
      }
      return true;
    }

    function panelClose() {
      if (!panel) return;
      panel.hidden = true;
      panel.classList.remove("is-open");
      setPanelInert(panel, true);
      var modal = panelModal();
      if (modal && modal.close) modal.close();
      var nameField = panel.querySelector('[name$="_name"]');
      if (nameField) nameField.required = false;
      if (select.dataset.acWasRequired === "1") {
        select.required = true;
        delete select.dataset.acWasRequired;
      }
      // Back to the control, showing the list's answer for whatever is in the box now — nothing, if the
      // text named nothing, which is rule 3 holding after the create was abandoned.
      input.value = currentLabel();
      input.focus();
    }

    function panelOpen() {
      if (!panel) return false;
      var modal = panelModal();
      if (modal) return modal.hasAttribute("open");
      return !panel.hidden;
    }

    if (panel) {
      var cancel = panel.querySelector("[data-qc-cancel]");
      if (cancel) cancel.addEventListener("click", function () { panelClose(false); });
      // Escape closes the panel and stays out of the global layer's way: from here it means the panel,
      // not the row cursor or the filter ([[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]]).
      panel.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !event.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          panelClose(false);
        }
      });
    }

    // Focus opens the list — EXCEPT for a control that opts out with `data-ac-no-focus-open`. The
    // console's keyboard walk focuses the picker and the booker/party fields PROGRAMMATICALLY, and an
    // auto-opened list makes the next Enter choose the first option instead of advancing the walk
    // (found by driving the real UI in tools/invoice-console-check.mjs). A click still opens the list,
    // and typing or ArrowDown still opens it, so a mouse and a browsing keyboard are unaffected.
    input.addEventListener("focus", function () { input.select(); if (!select.hasAttribute("data-ac-no-focus-open")) show(); });
    input.addEventListener("click", function () { show(); });
    input.addEventListener("input", show);

    input.addEventListener("keydown", function (event) {
      if (event.isComposing) return;
      var rows = shown();
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
        if (open && cursor >= 0 && rows[cursor]) {
          event.preventDefault();
          choose(rows[cursor]);
        } else if (!open) {
          event.preventDefault();
          show();
        }
      } else if (event.key === "Tab") {
        // Tab is a choice: tabbing past a combobox must not silently discard what was highlighted.
        if (open && cursor >= 0 && rows[cursor]) choose(rows[cursor]);
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
        // Focus went to the quick-create panel, which is the operator answering this control rather
        // than leaving it. Committing here would reset the box to the select's empty label and take the
        // typed name off the screen while the panel is showing it.
        if (panelOpen()) return;
        hide();
        commitTyped();
      }, 0);
    });

    list.addEventListener("mousedown", function (event) {
      var li = event.target.closest && event.target.closest(".ac-option");
      if (!li) return;
      event.preventDefault();
      // `data-i` counts the rows the list is SHOWING, which includes the create row and is not the same
      // array as `filtered`. Reading `filtered` here would have created whichever option happened to sit
      // at that index — an off-by-one whose only symptom is the wrong thing being created.
      choose(shown()[Number(li.getAttribute("data-i"))]);
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

    // refdb changed the select's options. When it reports WHICH row moved, update this control's
    // array incrementally instead of re-reading and re-normalising all ~1,000 labels — the DOM option
    // is already correct. A whole-list event (a hydrate) still re-reads.
    select.addEventListener("refdb:select", function (event) {
      var detail = event && event.detail;
      if (detail && detail.row) {
        var value = String(detail.row.id);
        options = options.filter(function (entry) { return entry.value !== value; });
        if (detail.action !== "remove") {
          var option = null;
          for (var i = 0; i < select.options.length; i++) { if (select.options[i].value === value) { option = select.options[i]; break; } }
          if (option) options.unshift({ value: value, label: (option.textContent || "").replace(/\s+/g, " ").trim() });
        }
      } else {
        options = readOptions(select);
      }
      if (open) refresh();
      else input.value = currentLabel();
    });
  }

  /**
   * Enhance every searchable select under `root`. Called with `document` once on load, and again by
   * `app.js` after an htmx swap with the swapped target (`#app-main`), because a swapped-in select is
   * a new element and its combobox does not travel with it. `enhance` itself is idempotent
   * (`dataset.acReady`), so re-running this over content that was not swapped is harmless.
   */
  function enhanceAll(root) {
    var list = root.querySelectorAll("select[data-searchable]");
    for (var i = 0; i < list.length; i++) {
      try { enhance(list[i]); } catch (error) { console.warn("autocomplete: " + (list[i].name || "select") + " left as a native select", error); }
    }
    // Every combobox now exists, including the ones a quick-create panel carries, so a closed panel can
    // be made inert without racing the enhancement order. Done for every panel on the page rather than
    // only those a select points at: a panel nothing opens has no business being submittable either.
    var panels = root.querySelectorAll(".qc");
    for (var j = 0; j < panels.length; j++) setPanelInert(panels[j], true);
  }

  function init() { enhanceAll(document); }

  // Exposed for the htmx re-init hook in app.js (and for harnesses) to re-scan a swapped subtree.
  window.__AA_AUTOCOMPLETE__ = { enhanceAll: enhanceAll };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
