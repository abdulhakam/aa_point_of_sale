/*
 * Keyboard control for the whole app — one layer, every page, no framework.
 *
 * The app works without this file: every binding here is an accelerator for something the HTML already
 * does. The only things this file *adds* are a way to discover the accelerators (`?`), a way to reach
 * any screen without touching the rail (`Ctrl+K`), and a visible focus ring for the row you are on.
 * That matters because the target is a direct shift of a legacy app the shop already uses
 * (`guest-ui-is-a-direct-shift-of-legacy`) and an operator who learns the rail once should not have to
 * learn a second navigation system — this is the second system, and it is keyboard-first.
 *
 * ── Three rules this file will not break ─────────────────────────────────────────────────────────────────
 *
 * 1. A bare letter NEVER fires while a text field, textarea, select or contenteditable has focus.
 *    Accounting software is full of fields with one or two letters in them, and a hotkey that swallows
 *    a typed "e" is worse than no hotkey at all. Only Escape, Ctrl+Enter and Alt+Arrow work while
 *    typing, because those have no meaning inside a field anyway.
 *
 * 2. A binding fires only when the modifiers it declares are the ONLY modifiers held. So Ctrl+Enter
 *    submits and plain Enter still inserts a newline, Ctrl+R still reloads, and Cmd+Tab still switches
 *    applications. This is checked against a declared list, not by hoping the browser intervenes.
 *
 * 3. Nothing destructive is bound to a keypress that does not also go through a form. A hotkey can
 *    submit a form; it cannot invent a delete. Where a form carries `data-confirm`, the confirm dialog
 *    still appears, because the hotkey submits the form rather than replacing the submission.
 */
(function () {
  "use strict";

  /* ─────────────────────────────────────────────────────────────────────────────── the key table */

  /**
   * `keys` is normalised: "j", "?", "ctrl+k", "alt+ArrowDown", "ctrl+Enter", "g g" (a two-key chord).
   * `group` is only for the help overlay. `when` narrows a binding to a page context, matched against
   * the pathname, so a table binding does not fire on a form page that happens to contain a table.
   */
  var BINDINGS = [
    { keys: "ctrl+k", alt: ":", group: "Go to", label: "Command palette — every link on this page", run: openPalette, inField: false },
    { keys: "?", shift: true, group: "Go to", label: "This help", run: toggleHelp, inField: false },
    { keys: "escape", group: "Go to", label: "Close an overlay, or clear the focused row", run: onEscape, inField: true },

    // ⚠️ `Ctrl+F` and `Ctrl+L` used to be listed here as "the same as / without stealing the browser's
    // own". They DO steal it: Ctrl+F is find-in-page in every browser and Ctrl+L is the address bar, and
    // both are muscle memory for a keyboard user. `/` is the key that needs no modifier and collides with
    // nothing, so it is the only binding for this action. The same reasoning is why `Ctrl+S` is absent.
    { keys: "/", group: "Find", label: "Focus the filter or search box on this page", run: focusFilter, inField: false, when: "filter" },
    { keys: "f", group: "Find", label: "Focus the first text field on this page", run: focusFirstField, inField: false, when: "field" },

    { keys: "j", group: "Move", label: "Next {r}", run: function () { moveRow(1); }, inField: false, when: "grid" },
    { keys: "k", group: "Move", label: "Previous {r}", run: function () { moveRow(-1); }, inField: false, when: "grid" },
    { keys: "g g", group: "Move", label: "First {r}", run: function () { moveRowTo("first"); }, inField: false, when: "grid" },
    { keys: "G", shift: true, group: "Move", label: "Last {r}", run: function () { moveRowTo("last"); }, inField: false, when: "grid" },
    { keys: "home", group: "Move", label: "First {r} of the grid", run: function () { moveRowTo("first"); }, inField: false, when: "grid" },
    { keys: "end", group: "Move", label: "Last {r} of the grid", run: function () { moveRowTo("last"); }, inField: false, when: "grid" },
    { keys: "pageDown", group: "Move", label: "Down ten {r}s", run: function () { moveRow(10); }, inField: false, when: "grid" },
    { keys: "pageUp", group: "Move", label: "Up ten {r}s", run: function () { moveRow(-10); }, inField: false, when: "grid" },
    // `enter` and `e` are advertised only when the FOCUSED row actually has something to open or edit. A
    // report row is `<td>`s and nothing else, so an unguarded `when: "row"` un-hid both the moment a row
    // was focused — the overlay started listing two keys that could only ever fail.
    { keys: "enter", group: "Move", label: "Open the focused {r}", run: openFocusedRow, inField: false, when: "openable" },
    { keys: "e", group: "Move", label: "Edit the focused {r}", run: editFocusedRow, inField: false, when: "editable" },

    { keys: "ctrl+enter", group: "Form", label: "Submit the form this field belongs to", run: submitForm, inField: true, when: "form" },
    // ⚠️ These two were spelled `alt+ArrowDown` / `alt+ArrowUp` and therefore matched NOTHING, ever, on
    // any page. `normalise` lowercases every named key — the DOM reports `ArrowDown`, the table has to say
    // `arrowdown` — so the comparison `b.keys === normal` compared "alt+ArrowDown" with "alt+arrowdown" and
    // always failed. Same failure mode as the Escape bug already recorded here, in the same file, three
    // bindings further up: a key that is spelled plausibly, dispatches correctly, and does nothing.
    { keys: "alt+arrowdown", group: "Form", label: "Next field", run: function () { moveField(1); }, inField: true, when: "field" },
    { keys: "alt+arrowup", group: "Form", label: "Previous field", run: function () { moveField(-1); }, inField: true, when: "field" },
    // `alt+1`..`alt+9` reach the page's action buttons. `hiddenInHelp` because the Form group's generic
    // "First action button on this page" line and the "On this page" line below — which carries the
    // button's own name — describe the SAME key, and a key listed twice under two different descriptions
    // reads as two keys. Dispatch lives here; the label comes from the button.
    { keys: "alt+1", hiddenInHelp: true, group: "Form", label: "First action button", run: function () { clickPageButton(1); } },
    { keys: "alt+2", hiddenInHelp: true, group: "Form", label: "Second action button", run: function () { clickPageButton(2); } },
    { keys: "alt+3", hiddenInHelp: true, group: "Form", label: "Third action button", run: function () { clickPageButton(3); } },
    { keys: "alt+4", hiddenInHelp: true, group: "Form", label: "Fourth action button", run: function () { clickPageButton(4); } },
    { keys: "alt+5", hiddenInHelp: true, group: "Form", label: "Fifth action button", run: function () { clickPageButton(5); } },
    { keys: "alt+6", hiddenInHelp: true, group: "Form", label: "Sixth action button", run: function () { clickPageButton(6); } },
    { keys: "alt+7", hiddenInHelp: true, group: "Form", label: "Seventh action button", run: function () { clickPageButton(7); } },
    { keys: "alt+8", hiddenInHelp: true, group: "Form", label: "Eighth action button", run: function () { clickPageButton(8); } },
    { keys: "alt+9", hiddenInHelp: true, group: "Form", label: "Ninth action button", run: function () { clickPageButton(9); } },

    { keys: "g d", group: "Jump", label: "Dashboard", href: "/dashboard" },
    { keys: "g i", group: "Jump", label: "Invoices", href: "/invoices" },
    { keys: "g n", group: "Jump", label: "New invoice", href: "/invoices/new" },
    { keys: "g p", group: "Jump", label: "Payments", href: "/payments" },
    { keys: "g m", group: "Jump", label: "New payment", href: "/payments/new" },
    { keys: "g v", group: "Jump", label: "Inventory", href: "/inventory" },
    { keys: "g r", group: "Jump", label: "Reports", href: "/reports" },
    { keys: "g c", group: "Jump", label: "Cash memo", href: "/cashmemo" },
    { keys: "g q", group: "Jump", label: "Print queue", href: "/print" },
    { keys: "g a", group: "Jump", label: "Management", href: "/management" },
    { keys: "g o", group: "Jump", label: "Pages index", href: "/p" },

    { keys: "p", group: "Act", label: "Print this page", run: printPage, inField: false, when: "printable" },
    { keys: "r", group: "Act", label: "Reload report data (the refresh button)", run: refreshReports, inField: false, when: "job" },
    { keys: "R", shift: true, group: "Act", label: "Reload this page", run: function () { window.location.reload(); }, inField: false }
  ];

  var CHORD_MS = 1500;
  var chord = null;
  var chordTimer = null;

  /* ────────────────────────────────────────────────────────────────────────────────── the row cursor */

  /**
   * The focused row is marked with a class AND focused with `tabindex="-1"`, so it is reachable
   * programmatically without joining the tab order. Tabbing past the table still works as it did
   * before — a keyboard shortcut that changed the tab order would break the one thing a keyboard user
   * already knows.
   */
  var rowCursor = null;

  /**
   * A "grid" is either a table's body or a tile grid — `main .tiles`, which is how the reports hub, the
   * ledger hub and the dashboard are built. A tile is a link with a label, so the same cursor drives it.
   *
   * This was the gap on the two report hubs: they are links and nothing else, so a cursor that only
   * understood `<tr>` left those pages reachable only by tabbing. `j`/`k` over the tiles is the whole
   * fix, and it needs no per-page registration because the shape is already in the markup.
   */
  function dataRows(table) {
    if (!table || !table.tBodies || !table.tBodies.length) return [];
    return Array.prototype.slice.call(table.tBodies[0].rows).filter(function (row) {
      // `hidden` matters now that a filter can hide rows: walking onto a row the operator cannot see is
      // the one way a cursor can get lost. The management lists could already do this; the report filter
      // makes it the common case.
      return !row.hidden && !row.querySelector("td.empty");
    });
  }

  function tileRows(grid) {
    return Array.prototype.slice.call(grid.querySelectorAll("a.tile[href]")).filter(visible);
  }

  function visible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  /** The grid a key should act on: the one the cursor is in, else the page's main one. */
  function currentGrid() {
    if (rowCursor) {
      var owner = rowCursor.closest("table, main .tiles");
      if (owner) return owner;
    }
    var table = document.querySelector("main table");
    if (table) return table;
    var tiles = document.querySelector("main .tiles");
    return tiles || null;
  }

  /** The cursor's items on the current grid — rows, or tiles. */
  function gridItems() {
    var grid = currentGrid();
    if (!grid) return [];
    return grid.tagName === "TABLE" ? dataRows(grid) : tileRows(grid);
  }

  /** What the focused row can be opened or edited as, if anything. A report row is neither. */
  function openTarget(row) {
    if (!row) return null;
    if (row.tagName === "A") return row;
    return row.querySelector("a[href]");
  }

  function editTarget(row) {
    if (!row) return null;
    if (row.tagName === "A") return null;
    return row.querySelector('a[href*="/edit"], form[action] button, a[href*="/edit/"]');
  }

  function paintRow(row) {
    if (rowCursor && rowCursor !== row) {
      rowCursor.classList.remove("hk-row");
      rowCursor.removeAttribute("tabindex");
    }
    rowCursor = row;
    if (!row) return;
    row.classList.add("hk-row");
    // -1 keeps it out of the tab order while making focus() work.
    row.setAttribute("tabindex", "-1");
    row.focus({ preventScroll: true });
    row.scrollIntoView({ block: "nearest" });
    announce(rowLabel(row));
  }

  /** What to say out loud for a row: its first few cells, without the action buttons' labels. */
  function rowLabel(row) {
    var cells = row.tagName === "TR" ? Array.prototype.slice.call(row.cells || []) : [];
    var parts = cells
      .map(function (cell) { return (cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim(); })
      .filter(function (text) { return text && text !== "Edit" && text !== "Delete" && text !== "View"; });
    if (!parts.length) parts = [(row.innerText || row.textContent || "").replace(/\s+/g, " ").trim()];
    return parts.join(" · ").slice(0, 160);
  }

  function moveRow(step) {
    var rows = gridItems();
    if (!rows.length) return;
    var index = rowCursor ? rows.indexOf(rowCursor) : -1;
    var next = index + step;
    if (next < 0) next = 0;
    if (next > rows.length - 1) next = rows.length - 1;
    paintRow(rows[next]);
  }

  function moveRowTo(where) {
    var rows = gridItems();
    if (!rows.length) return;
    paintRow(where === "last" ? rows[rows.length - 1] : rows[0]);
  }

  function openFocusedRow() {
    var target = openTarget(rowCursor);
    if (!target) return false;
    window.location.href = target.href;
    return true;
  }

  function editFocusedRow() {
    var target = editTarget(rowCursor);
    if (!target) return false;
    target.click();
    return true;
  }

  /* ───────────────────────────────────────────────────────────────────────────────────── the fields */

  function typing() {
    var el = document.activeElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  function fields() {
    var scope = document.querySelector("main form") || document;
    return Array.prototype.slice
      .call(scope.querySelectorAll("input:not([type=hidden]):not([disabled]):not(.aa-date-native), textarea, select"))
      .filter(function (el) {
        return el.offsetParent !== null || el.getClientRects().length;
      });
  }

  function focusFirstField() {
    var list = fields();
    if (!list.length) return false;
    list[0].focus();
    if (list[0].select) list[0].select();
    return true;
  }

  function moveField(step) {
    var list = fields();
    if (!list.length) return false;
    var index = list.indexOf(document.activeElement);
    // An index of -1 means focus is NOT on one of the fields — on the toolbar's search box, or on the
    // body. The old code then computed `next = 0` for both directions, so Alt+ArrowDown on the parties
    // page refocused the same search box and appeared to do nothing. Entering the set is now directional:
    // down lands on the first field, up on the last, and Alt+ArrowUp from there walks back out to
    // whatever had focus.
    var next = index < 0 ? (step > 0 ? 0 : list.length - 1) : index + step;
    if (next < 0) next = 0;
    if (next > list.length - 1) next = list.length - 1;
    list[next].focus();
    if (list[next].select) list[next].select();
    return true;
  }

  function submitForm() {
    var form = (document.activeElement && document.activeElement.form) || document.querySelector("main form");
    if (!form) return false;
    // requestSubmit, not submit: it runs validation and fires the submit event, so a `data-confirm`
    // form still confirms and a required field still blocks. `form.submit()` would skip both.
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.submit();
    return true;
  }

/**
  * The page's action buttons, in the order the help listed them. `alt+1`..`alt+9` reach them, so the
  * numbered list in the help overlay is a promise rather than a decoration — an advertised shortcut that
  * does nothing is worse than no shortcut, because it teaches the reader to distrust the rest of the
  * list.
  *
  * ⚠️ This list and the help overlay's list must be the SAME list, or the numbers disagree. The first
  * version derived the label from `innerText`, so the report page's printer glyph — an icon-only button
  * with a `title` and an `aria-label` and no text — was invisible to the overlay. It was `alt+1` in fact
  * and `alt+2` on screen, so a reader counting buttons from the help opened the print dialog. Both places
  * now go through `buttonLabel()`.
  */
function buttonLabel(el) {
  var text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text;
  return (el.getAttribute("title") || el.getAttribute("aria-label") || "").trim();
}

function pageButtons() {
  return Array.prototype.slice.call(document.querySelectorAll("main a.btn, main button.btn")).filter(function (el) {
    return el.offsetParent !== null || el.getClientRects().length;
  });
}

function clickPageButton(n) {
  var list = pageButtons();
  var target = list[n - 1];
  if (!target) return false;
  target.click();
  return true;
}

/**
 * The page's filter box: the input the table filter or the search field is bound to, or — on a report —
 * the row filter the report template now carries.
 *
 * ⚠️ On the report and ledger pages this used to resolve to nothing, and the binding had no guard, so `/`
 * was advertised on all sixteen of those screens and did nothing on every one. Two fixes were needed, not
 * one: a target to focus, and a guard so the overlay stops claiming it where there is none.
 */
  function filterInput() {
    return (
      document.querySelector("[data-table-filter]") ||
      document.querySelector('input[type="search"]') ||
      document.querySelector('main input[name="q"]')
    );
  }

  function focusFilter() {
    var input = filterInput();
    if (!input) return false;
    input.focus();
    input.select();
    announce("Filter");
    return true;
  }

  function printPage() {
    var button = document.querySelector("[data-print]");
    if (button) {
      button.click();
      return true;
    }
    window.print();
    return true;
  }

  function refreshReports() {
    var button = document.querySelector("[data-job]");
    if (!button) return false;
    button.click();
    return true;
  }

  /* ──────────────────────────────────────────────────────────────────────────────── announcements */

  /**
   * A live region, so the app is usable without sight of the focus ring. `polite`, not `assertive`:
   * this narrates a cursor moving, and interrupting someone for every row would be hostile.
   */
  var live = null;
  function announcer() {
    if (live) return live;
    live = document.createElement("div");
    live.className = "hk-live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    document.body.appendChild(live);
    return live;
  }
  function announce(text) {
    if (!text) return;
    announcer().textContent = text;
  }

  /* ───────────────────────────────────────────────────────────────────────────────── the overlays */

  function overlay(id, build) {
    var existing = document.getElementById(id);
    if (existing) {
      existing.remove();
      return null;
    }
    var back = document.createElement("div");
    back.className = "hk-overlay";
    back.id = id;
    back.setAttribute("role", "dialog");
    back.setAttribute("aria-modal", "true");
    back.addEventListener("mousedown", function (event) {
      if (event.target === back) back.remove();
    });
    build(back);
    document.body.appendChild(back);
    return back;
  }

  /** Every link on the page, deduplicated, labelled by its text or its title. */
  function allLinks() {
    var seen = {};
    return Array.prototype.slice
      .call(document.querySelectorAll("a[href]"))
      .filter(function (a) {
        var href = a.getAttribute("href");
        if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return false;
        if (seen[href]) return false;
        seen[href] = true;
        return true;
      })
      .map(function (a) {
        var label = (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim();
        if (!label) label = a.getAttribute("title") || "";
        // An icon-only rail link has no text; its title is the name a person would use.
        var svg = a.querySelector("svg");
        if (!label && svg) label = a.getAttribute("title") || href;
        return { href: a.href, label: label || href, area: a.closest("nav.navbar") ? "rail" : a.closest("main") ? "page" : "other" };
      })
      .sort(function (a, b) {
        return a.area === b.area ? a.label.localeCompare(b.label) : a.area === "rail" ? -1 : b.area === "rail" ? 1 : 0;
      });
  }

  function openPalette() {
    var links = allLinks();
    var back = overlay("hk-palette", function (root) {
      root.innerHTML =
        '<div class="hk-panel hk-palette-panel">' +
        '<input class="hk-palette-input" type="text" placeholder="Jump to…" aria-label="Jump to" ' +
        'autocomplete="off" spellcheck="false">' +
        '<ul class="hk-palette-list" role="listbox"></ul>' +
        '<p class="hk-palette-hint">↑↓ choose · Enter go · Esc close</p>' +
        "</div>";
    });
    if (!back) return;
    var input = back.querySelector(".hk-palette-input");
    var list = back.querySelector(".hk-palette-list");
    var shown = 0;
    var cursor = 0;

    function draw() {
      var needle = input.value.toLowerCase().trim();
      var matches = links.filter(function (l) {
        return !needle || l.label.toLowerCase().indexOf(needle) !== -1 || l.href.toLowerCase().indexOf(needle) !== -1;
      }).slice(0, 40);
      shown = matches.length;
      cursor = 0;
      list.innerHTML = matches
        .map(function (l, i) {
          return (
            '<li class="hk-palette-item' + (i === 0 ? " is-cursor" : "") + '" role="option" aria-selected="' + (i === 0) + '">' +
            '<span class="hk-palette-label"></span>' +
            '<span class="hk-palette-href"></span>' +
            "</li>"
          );
        })
        .join("");
      var items = list.children;
      for (var i = 0; i < items.length; i++) {
        items[i].querySelector(".hk-palette-label").textContent = matches[i].label;
        items[i].querySelector(".hk-palette-href").textContent = matches[i].href.replace(location.origin, "");
      }
      if (!matches.length) {
        list.innerHTML = '<li class="hk-palette-empty">Nothing matches. The links are the page\'s own — a screen that does not link to it cannot be found from here.</li>';
      }
    }

    function move(step) {
      var items = list.querySelectorAll(".hk-palette-item");
      if (!items.length) return;
      cursor = (cursor + step + items.length) % items.length;
      for (var i = 0; i < items.length; i++) {
        var on = i === cursor;
        items[i].classList.toggle("is-cursor", on);
        items[i].setAttribute("aria-selected", String(on));
        if (on) items[i].scrollIntoView({ block: "nearest" });
      }
    }

    function commit() {
      var items = list.querySelectorAll(".hk-palette-item");
      if (!items.length) return;
      var chosen = links.filter(function (l) {
        return !input.value.toLowerCase().trim() || l.label.toLowerCase().indexOf(input.value.toLowerCase().trim()) !== -1 || l.href.toLowerCase().indexOf(input.value.toLowerCase().trim()) !== -1;
      }).slice(0, 40);
      var target = chosen[cursor];
      if (target) window.location.href = target.href;
    }

    input.addEventListener("input", draw);
    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
      else if (event.key === "Enter") { event.preventDefault(); commit(); }
      else if (event.key === "Escape") { event.preventDefault(); back.remove(); }
    });
    draw();
    input.focus();
    announce(shown + " links");
  }

  /**
   * Whether a binding's `when` clause is satisfied by this page. One place, so the help overlay and the
   * dispatcher can never disagree about what a key does here — an overlay that lists a key the dispatcher
   * will ignore is the exact failure the vault has recorded twice.
   */
  function whenHolds(when) {
    switch (when) {
      case "grid": return gridItems().length > 0;
      case "openable": return !!openTarget(rowCursor);
      case "editable": return !!editTarget(rowCursor);
      case "filter": return !!filterInput();
      case "field": return fields().length > 0;
      case "form": return !!((document.activeElement && document.activeElement.form) || document.querySelector("main form"));
      case "printable": return !!document.querySelector("[data-print]");
      case "job": return !!document.querySelector("[data-job]");
      default: return true;
    }
  }

  /**
   * The help overlay is built from the table above plus what the page actually offers, so it cannot
   * describe a shortcut that is not there. The nav chords are labelled from the rail's own titles
   * rather than a hand-written list, which means a nav link added later shows up here on its own.
   */
  function helpGroups() {
    var groups = {};

    /**
     * The noun for what the cursor moves over on THIS page: a row in a table, a tile in a tile grid.
     * `{r}` in a label is replaced with it, so the hub says "Next tile" and a report says "Next row"
     * rather than both claiming a row that is not there.
     */
    var gridNoun = (function () {
      var grid = currentGrid();
      return grid && grid.tagName !== "TABLE" ? "tile" : "row";
    })();

    function add(group, key, label) {
      (groups[group] = groups[group] || []).push({ key: key, label: label.split("{r}").join(gridNoun) });
    }

    BINDINGS.forEach(function (b) {
      if (b.when && !whenHolds(b.when)) return;
      // A jump binding is listed from the chord map below, keyed by its destination — so it is skipped
      // here. Adding it here as well is what listed every rail destination twice in the first version.
      if (b.href) return;
      if (b.hiddenInHelp) return;
      var keys = b.keys + (b.alt ? "  ·  " + b.alt : "");
      add(b.group, keys, b.label);
    });

    // The rail's own links, labelled from the rail's own titles rather than a hand-written list, so a
    // nav link added later shows up here on its own. Keyed by href, and it REPLACES the static chord where
    // both describe the same destination — otherwise every rail destination is listed twice, once bare and
    // once with its title, which is how the first version of this overlay read.
    var chordByHref = {};
    BINDINGS.forEach(function (b) { if (b.href) chordByHref[b.href] = b.keys; });
    Array.prototype.slice.call(document.querySelectorAll("nav.navbar a.nav-link")).forEach(function (a) {
      var href = new URL(a.href, location.origin).pathname;
      if (!chordByHref[href]) return;
      chordByHref[href] = { keys: chordByHref[href], label: (a.getAttribute("title") || href) + " — " + href };
    });
    Object.keys(chordByHref).forEach(function (href) {
      var c = chordByHref[href];
      if (typeof c === "string") add("Jump", c, href);
      else add("Jump", c.keys, c.label);
    });

    // Anything the page offers that is not a rail link. Read from the SAME list `alt+1`..`alt+9` click, so
    // the numbering here is the numbering that works.
    pageButtons().slice(0, 9).forEach(function (el, i) {
      var label = buttonLabel(el);
      if (!label) return;
      add("On this page", "alt+" + (i + 1), label);
    });

    return groups;
  }

  /**
   * Render a key spec as keycaps. The spec may hold alternatives separated by `  ·  ` (so one binding
   * can be reached two ways), and one alternative may be a chord, which reads "then" between the steps.
   * A step keeps its modifiers inside one cap — `ctrl+k`, not two caps — because a keyboard user reads
   * the whole combination as one thing and two caps plus a plus sign is three things to parse.
   *
   * ⚠️ The first version did `split(/\s{2,}|\s·\s/)` then `join(" then ")` then a second `replace(/ then /
   * ...)`. The two rewrites fought each other and produced "ctrl+k then" on one line with a stray ":"
   * under it. Rendering is not worth automating this hard; this is the version that reads correctly.
   */
  function keyCap(text) {
    var ARROWS = { arrowdown: "↓", arrowup: "↑", arrowleft: "←", arrowright: "→", space: "space", escape: "esc", pageup: "pgup", pagedown: "pgdn", home: "home", end: "end" };
    var parts = String(text).split(/\s{2,}\s*·\s*|\s{2,}/);
    return parts
      .map(function (part) {
        return part
          .trim()
          .split(/\s+/)
          .map(function (step) {
            var pretty = step
              .split("+")
              .map(function (k) { return ARROWS[k] || k; })
              .join("+");
            return "<kbd>" + pretty + "</kbd>";
          })
          .join(' <span class="hk-sep">then</span> ');
      })
      .join(' <span class="hk-sep">or</span> ');
  }

  function toggleHelp() {
    var back = overlay("hk-help", function (root) {
      var groups = helpGroups();
      var order = ["Go to", "Jump", "Find", "Move", "Form", "Act", "On this page"];
      var body = order
        .filter(function (name) { return groups[name]; })
        .map(function (name) {
          return (
            '<section class="hk-help-group"><h3>' + name + "</h3><dl>" +
            groups[name]
              .map(function (row) {
                return "<div class='hk-help-row'><dt>" + keyCap(row.key) + "</dt><dd>" + row.label + "</dd></div>";
              })
              .join("") +
            "</dl></section>"
          );
        })
        .join("");
      root.innerHTML =
        '<div class="hk-panel hk-help-panel">' +
        "<h2>Keyboard</h2>" +
        "<p class='hk-help-note'>This list is built from this page, so it only shows shortcuts that work here. " +
        "A bare letter never fires while you are typing in a field. " +
        "Nothing destructive is bound to a key that skips the form it belongs to.</p>" +
        body +
        "<p class='hk-help-foot'>Esc closes this. Nothing here is a substitute for the mouse — every shortcut is an accelerator.</p>" +
        "</div>";
    });
    if (!back) return;
    var first = back.querySelector("button, input, [tabindex]");
    if (first) first.focus();
    else back.focus();
  }

  function clearRow() {
    if (!rowCursor) return;
    rowCursor.classList.remove("hk-row");
    rowCursor.removeAttribute("tabindex");
    rowCursor = null;
    announce("Row cleared");
  }

  function onEscape() {
    if (document.getElementById("hk-help")) { document.getElementById("hk-help").remove(); return; }
    if (document.getElementById("hk-palette")) { document.getElementById("hk-palette").remove(); return; }
    if (rowCursor) { clearRow(); return; }
    var filter = filterInput();
    if (filter && filter.value) {
      filter.value = "";
      filter.dispatchEvent(new Event("input", { bubbles: true }));
      announce("Filter cleared");
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────────── key dispatch */

  /**
 * `Escape`, `Enter`, `ArrowDown`, `Home`, `End`, `PageUp` and `PageDown` arrive from the DOM
 * capitalised, and a single character arrives as itself — `G` is `G`, `?` is `?`. So the named keys
 * are lowercased and single characters are left alone: a binding is spelled `escape`, `G`, `?`.
 *
 * Matching the named keys case-sensitively was a real bug, and an invisible one: `escape` never matched
 * `Escape`, so Escape did nothing on any page while `j`, `k` and `G` worked. The overlay and the row
 * cursor both rely on it.
 */
  var NAMED_KEYS = { escape: 1, enter: 1, tab: 1, home: 1, end: 1, pageup: 1, pagedown: 1, arrowup: 1, arrowdown: 1, arrowleft: 1, arrowright: 1, space: 1, " ": 1, delete: 1, backspace: 1 };

  function normalise(event) {
    var key = event.key;
    if (key.length === 1) key = key === " " ? "space" : key;
    else key = key.toLowerCase();
    var mods = "";
    if (event.ctrlKey || event.metaKey) mods = "ctrl+";
    if (event.altKey) mods += "alt+";
    return mods + key;
  }

  /**
   * Rule 2: a binding fires only when the modifiers it declares are EXACTLY the ones held.
   *
   * `binding.shift === true` is how a binding says "this key only counts while Shift is down", which is
   * what `?` and `G` are. For a single-character key `normalise` emits the character itself and never a
   * `shift+` prefix — Chrome reports shift+/ as `key: "?"` — so the shift requirement has to live on the
   * binding. Spelling `keys: "shift+?"` would be a binding nothing can ever match, because no keystroke
   * normalises to that string. That is not hypothetical: it is what the reload binding was first written
   * as, and `hotkey-check.mjs` could not reach it.
   *
   * ⚠️ This must read `binding.keys` and `binding.shift`, NOT the binding object. Testing the object
   * coerces it to "[object Object]", so every test fails the same way: `wantsCtrl` and `wantsAlt` are
   * both false and `shiftIsSemantic` is false, and so EVERY binding with Ctrl, Alt or Shift held is
   * silently rejected. `?`, `G` and `Ctrl+K` all looked like "the key does nothing". A keyboard layer
   * fails silently like this — which is why the check drives real keystrokes instead of reading the file.
   */
  function modifierMatches(binding, event) {
    var wantsCtrl = /ctrl/.test(binding.keys);
    var wantsAlt = /alt/.test(binding.keys);
    var wantsShift = binding.shift === true;
    if (wantsCtrl !== (event.ctrlKey || event.metaKey)) return false;
    if (wantsAlt !== event.altKey) return false;
    if (wantsShift !== event.shiftKey) return false;
    return true;
  }

  function match(normal, event) {
    for (var i = 0; i < BINDINGS.length; i++) {
      var b = BINDINGS[i];
      if (b.when && !whenHolds(b.when)) continue;
      if (!modifierMatches(b, event)) continue;
      if (b.keys === normal && (!b.alt || !typing())) return b;
      if (b.alt === normal) return b;
    }
    return null;
  }

  function onKeyDown(event) {
    if (event.isComposing) return;

    var normal = normalise(event);
    var field = typing();

    // Rule 1. Escape, Ctrl+Enter and Alt+Arrow are the only bindings that work while typing.
    var allowedInField = { escape: 1, "ctrl+enter": 1, "alt+arrowdown": 1, "alt+arrowup": 1 };
    if (field && !allowedInField[normal]) {
      // Escape still closes an overlay opened from inside a field.
      if (normal === "escape") {
        var open = document.getElementById("hk-help") || document.getElementById("hk-palette");
        if (open) {
          event.preventDefault();
          open.remove();
        }
      }
      return;
    }

    // A chord: "g" then a second key. Timed out, it is abandoned and the timer is cleared.
    if (chord) {
      var first = chord;
      chord = null;
      clearTimeout(chordTimer);
      var two = first + " " + normal;
      var hit = null;
      for (var i = 0; i < BINDINGS.length; i++) {
        if (BINDINGS[i].keys === two) {
          hit = BINDINGS[i];
          break;
        }
      }
      if (hit) {
        event.preventDefault();
        fire(hit);
      } else if (first === "escape") {
        onEscape();
      } else {
        announce("no shortcut for " + first + " " + normal);
      }
      return;
    }

    var binding = match(normal, event);
    if (!binding) {
      // A lone "g" starts the jump chord. Anything else that looks like a prefix waits too, so "?"
      // is instant but a future "g g" still works.
      for (var j = 0; j < BINDINGS.length; j++) {
        if (BINDINGS[j].keys.indexOf(normal + " ") === 0 && !typing()) {
          chord = normal;
          clearTimeout(chordTimer);
          chordTimer = setTimeout(function () {
            chord = null;
          }, CHORD_MS);
          announce("key prefix: " + normal);
          event.preventDefault();
          return;
        }
      }
      return;
    }

    event.preventDefault();
    fire(binding);
  }

  function fire(binding) {
    if (binding.href) {
      window.location.href = binding.href;
      return;
    }
    var handled = false;
    try {
      handled = binding.run() !== false;
    } catch (error) {
      handled = false;
      // Logged, not swallowed. A hotkey that silently does nothing is indistinguishable from a
      // hotkey that is not bound, and that is exactly how `/jobs/reconcile`'s TypeError hid in the
      // server log for a month (see [[tb-0032-manifest-first-refactor]]): swallowed, reported as
      // success, never investigated. A keyboard layer that cannot fail loudly is worse than none.
      console.warn("hotkeys: " + binding.keys + " failed", error);
    }
    if (handled && binding.label) announce(binding.label);
  }

  /* ────────────────────────────────────────────────────────────────────────────────── the nudge */

  /**
   * A keyboard-first app is undiscoverable if nobody finds the key. One small, unobtrusive hint on the
   * first page of the session only — a toast on every page would be a tax paid forever to solve a
   * one-time problem.
   */
  function nudge() {
    var KEY = "hk-nudge-seen";
    try {
      if (window.sessionStorage.getItem(KEY)) return;
      window.sessionStorage.setItem(KEY, "1");
    } catch (error) {
      /* private mode: show it once per page load instead of failing */
    }
    var el = document.createElement("div");
    el.className = "hk-nudge";
    el.innerHTML = "<span>This app is keyboard-first. Press <kbd>?</kbd> for the shortcuts.</span>";
    el.addEventListener("click", function () {
      el.remove();
      toggleHelp();
    });
    document.body.appendChild(el);
    setTimeout(function () {
      el.classList.add("hk-nudge-out");
      setTimeout(function () { el.remove(); }, 400);
    }, 6000);
  }

  /* ───────────────────────────────────────────────────────────────────────────────────── boot */

  function init() {
    if (!document.querySelector("main")) return;
    document.addEventListener("keydown", onKeyDown);

    /**
     * A readiness marker, because `document.readyState` is `"interactive"` BEFORE deferred scripts run —
     * the spec sets it as parsing finishes, then runs the deferred scripts, then fires DOMContentLoaded.
     * Anything that waits on `readyState === "interactive"` to decide the page is ready can therefore
     * act before this file exists. `hotkey-check.mjs` did exactly that and its keystrokes landed on a page
     * with no listener attached, which looked like a dead key. Waiting on this attribute is waiting on the
     * thing that actually has to be true.
     */
    document.documentElement.setAttribute("data-hk-ready", "1");

    // Clicking a row moves the cursor to it, so the mouse and the keyboard do not disagree about
    // which row `enter` will act on. A tile counts as a row: on the report hubs a tile IS the row.
    document.addEventListener("mousedown", function (event) {
      var hit = event.target.closest && event.target.closest("main table tbody tr, main .tiles a.tile");
      if (hit && !hit.querySelector("td.empty")) paintRow(hit);
    });

    // A filter that hides the focused row must not leave the cursor on something invisible.
    //
    // ⚠️ This used to call `onEscape()`. That is the same bug wearing a different hat: `onEscape` falls
    // through to its last leg and CLEARS THE FILTER, then dispatches another `input` event, which re-runs
    // the filter with an empty needle and shows every row again. So typing one character in a filter hid
    // 331 of 333 rows, and the listener immediately undid it. Verified on /reports/payments: needle `8606`
    // matched 2 rows and 333 stayed visible, with the input's own value left empty.
    // Only the cursor is cleared here. The filter is what the operator just typed.
    var filter = filterInput();
    if (filter) {
      filter.addEventListener("input", function () {
        if (!rowCursor || rowCursor.hidden) clearRow();
      });
    }

    if (document.querySelector("[data-print]") || document.querySelector("nav.navbar")) nudge();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();