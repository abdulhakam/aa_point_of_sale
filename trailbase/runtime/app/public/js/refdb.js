/*
 * refdb — the client reference-list cache, in IndexedDB.
 *
 * WHY THIS EXISTS. The legacy app kept some server data on the client so a dropdown did not go back
 * to the server every time and a freshly created row was usable at once. The guest renders every
 * `<option>` server-side, so a new row only appeared after a reload. This file holds the reference
 * tables in IndexedDB, populates every `select[data-ref]` from it, and lets a create insert a row
 * into the store — which lands in every matching select, including an open autocomplete, with no
 * reload and no close/reopen. See [[reference-lists-come-from-indexeddb]].
 *
 * ── Rules it will not break ──────────────────────────────────────────────────────────────────────────
 *
 * 1. **The server-rendered markup is the no-JavaScript fallback.** This only REPLACES the options of
 *    a select it recognises. If IndexedDB is unavailable, the fetch fails, or a select is not
 *    annotated, the page is exactly what the server sent — a working form.
 * 2. **The native `<select>` stays the source of what is submitted.** It keeps its `name`, its value
 *    and its blank option; this rewrites its `<option>` children only, never dispatches a `change`
 *    (so nothing recalculates on hydration), and re-selects the value that was already chosen.
 * 3. **A stale cache never validates a write.** Ids are still checked by the server on every write;
 *    this store only decides what a picker shows.
 * 4. **`data-ref` names the list; the table it maps to is decided in one place** (`refKey`), because
 *    the refs keys and the entity field sources are not spelled the same (`bookers` vs
 *    `order_bookers`, `partyTypes` vs `party_types`).
 *
 * The counterpart is `GET /data/refs`, which reads the same `app/sql/refs.sql` lists every screen
 * uses, projected to the columns a control reads. The embedded `<meta name="aa-refdb-version">` is
 * the report service's data fingerprint: when it matches what is stored, the cache is used as-is.
 */
(function () {
  "use strict";

  var DB_NAME = "aa-pos-refdb";
  var DB_VERSION = 1;
  var META_STORE = "meta";

  // What the refs key is, given the `data-ref` value a template wrote. Most pass the refs key; the
  // management/report sources pass the table name.
  var REF_ALIAS = {
    order_bookers: "bookers",
    party_types: "partyTypes",
    invoice_types: "invoiceTypes",
    payment_types: "paymentTypes",
  };
  function refKey(name) {
    var n = String(name || "");
    return REF_ALIAS[n] || n;
  }

  // The label field and the extra data attributes a select's options carry. `items` is the one that
  // matters beyond display: the invoice grid fills a line from `data-price`/`data-cost`/`data-box`
  // on change, so those attributes must survive a repopulation (app.js reads them).
  var TABLE_SPEC = {
    parties: { label: "name" },
    items: { label: "name", data: { price: "sale_price", cost: "cost_price", box: "box_size_qty" } },
    areas: { label: "name" },
    sections: { label: "name" },
    companies: { label: "name" },
    bookers: { label: "name" },
    partyTypes: { label: "name" },
    invoiceTypes: { label: "name" },
    paymentTypes: { label: "name" },
  };

  // The nine lists defined by app/sql/refs.sql, in one client place: derived from the spec so the
  // store list and the label/attribute map cannot drift from each other. (`/data/refs` serves the
  // same keys; adding a list there without adding it here means it is simply not cached.)
  var TABLES = Object.keys(TABLE_SPEC);

  var cache = null; // table -> array of rows, once ready
  var dbPromise = null;
  var channel = null;
  try {
    if (typeof BroadcastChannel === "function") channel = new BroadcastChannel("aa-refdb");
  } catch (e) {
    channel = null;
  }

  // ────────────────────────────────────────────────────────────────────────── IndexedDB plumbing

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        for (var i = 0; i < TABLES.length; i++) {
          if (!db.objectStoreNames.contains(TABLES[i])) db.createObjectStore(TABLES[i], { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
    return dbPromise;
  }

  function readAll(db, store) {
    return new Promise(function (resolve, reject) {
      var request = db.transaction(store, "readonly").objectStore(store).getAll();
      request.onsuccess = function () { resolve(request.result || []); };
      request.onerror = function () { reject(request.error); };
    });
  }

  // The stored VALUE, not the whole record: the `meta` store is keyPath "key", so `get` resolves
  // `{key, value}`. Returning the record made the version guard compare an object to a number and
  // never match, so the cache was re-fetched on every page.
  function readMeta(db, key) {
    return new Promise(function (resolve, reject) {
      var request = db.transaction(META_STORE, "readonly").objectStore(META_STORE).get(key);
      request.onsuccess = function () { resolve(request.result ? request.result.value : null); };
      request.onerror = function () { reject(request.error); };
    });
  }

  /** Replace every table and the stored version in one transaction. */
  function replaceAll(db, tables, version) {
    return new Promise(function (resolve, reject) {
      var names = TABLES.concat([META_STORE]);
      var tx = db.transaction(names, "readwrite");
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      for (var i = 0; i < TABLES.length; i++) {
        var store = tx.objectStore(TABLES[i]);
        store.clear();
        var rows = tables[TABLES[i]] || [];
        for (var j = 0; j < rows.length; j++) store.put(rows[j]);
      }
      tx.objectStore(META_STORE).put({ key: "version", value: version });
    });
  }

  function putRow(db, table, row) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(table, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
      tx.objectStore(table).put(row);
    });
  }

  function deleteRow(db, table, id) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(table, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
      tx.objectStore(table).delete(id);
    });
  }

  // ────────────────────────────────────────────────────────────────────────── rendering a select

  function optionFor(spec, row) {
    var option = document.createElement("option");
    option.value = String(row.id);
    var label = row[spec.label];
    option.textContent = label === undefined || label === null || label === "" ? String(row.id) : String(label);
    if (spec.data) {
      for (var key in spec.data) {
        if (!Object.prototype.hasOwnProperty.call(spec.data, key)) continue;
        var value = row[spec.data[key]];
        if (value !== undefined && value !== null) option.dataset[key] = String(value);
      }
    }
    return option;
  }

  /**
   * Repopulate one select from the cache. Keeps the blank option, keeps the chosen value, and never
   * fires `change` — the caller decides whether to. Dispatches `refdb:select` so the searchable
   * control rebuilds its own option array in place.
   */
  function renderSelect(select) {
    if (!cache || select.multiple) return false;
    var key = refKey(select.getAttribute("data-ref"));
    var rows = cache[key];
    if (!rows) return false;
    var spec = TABLE_SPEC[key] || { label: "name" };

    var blank = null;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === "") { blank = select.options[i].cloneNode(true); break; }
    }
    var value = select.value;

    var frag = document.createDocumentFragment();
    if (blank) frag.appendChild(blank);
    for (var j = 0; j < rows.length; j++) frag.appendChild(optionFor(spec, rows[j]));

    select.innerHTML = "";
    select.appendChild(frag);
    // Restore the chosen value if it still exists (a deleted row leaves the blank option, which is
    // the honest answer: the value is no longer a valid choice).
    if (value) select.value = value;

    select.dispatchEvent(new Event("refdb:select"));
    return true;
  }

  /** Full rebuild of every annotated select — only when the cache was refetched (a version change). */
  function applyAll() {
    var selects = document.querySelectorAll("select[data-ref]");
    for (var i = 0; i < selects.length; i++) renderSelect(selects[i]);
  }

  /** The option in a select whose value is `value`, or null. Compared by value, never a selector. */
  function optionWithValue(select, value) {
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === value) return select.options[i];
    }
    return null;
  }

  /**
   * Patch one row into (or out of) the selects that show its list — WITHOUT rebuilding them.
   *
   * A full `renderSelect` per select is O(selects x options): the invoice grid has ~37 item selects
   * of 207 options each, so one item create rebuilt ~7,660 `<option>` nodes. This changes only the
   * row that moved. The new row's id sorts newest-first (uuid_v7), matching the server's `id DESC`,
   * so it is inserted directly after the blank option. Dispatches `refdb:select` with the change in
   * `detail`, so the searchable control updates its own array incrementally.
   */
  function patch(table, action, row) {
    var key = refKey(table);
    var spec = TABLE_SPEC[key] || { label: "name" };
    var selects = document.querySelectorAll("select[data-ref]");
    var detail = { table: key, action: action, row: row };
    var value = row ? String(row.id) : "";
    for (var i = 0; i < selects.length; i++) {
      var select = selects[i];
      if (select.multiple) continue;
      if (refKey(select.getAttribute("data-ref")) !== key) continue;
      var existing = optionWithValue(select, value);
      if (action === "remove") {
        if (existing) select.removeChild(existing);
      } else {
        if (existing) select.removeChild(existing);
        var blank = optionWithValue(select, "");
        var option = optionFor(spec, row);
        if (blank) select.insertBefore(option, blank.nextSibling);
        else select.insertBefore(option, select.firstChild);
      }
      select.dispatchEvent(new CustomEvent("refdb:select", { detail: detail }));
    }
  }

  // ────────────────────────────────────────────────────────────────────────── public API

  function announce(table, action, row) {
    if (!channel) return;
    try { channel.postMessage({ table: table, action: action, row: row }); } catch (e) { /* channel closed */ }
  }

  /**
   * Apply a change that arrived FROM another tab. IndexedDB is shared per origin, so the originating
   * tab already wrote it; this only updates the in-memory cache and the DOM, and does NOT re-announce
   * — re-announcing is what made two tabs ping-pong the same change forever.
   */
  function applyRemote(table, action, row) {
    var key = refKey(table);
    if (cache) {
      if (!cache[key]) cache[key] = [];
      if (action === "remove") cache[key] = cache[key].filter(function (r) { return String(r.id) !== String(row.id); });
      else {
        var at = -1;
        for (var i = 0; i < cache[key].length; i++) { if (String(cache[key][i].id) === String(row.id)) { at = i; break; } }
        if (at === -1) cache[key].unshift(row); else cache[key][at] = row;
      }
    }
    patch(key, action, row);
  }

  /** Insert-or-replace one row in the cache and in every select that shows its list. */
  function upsert(table, row) {
    var key = refKey(table);
    if (cache) {
      if (!cache[key]) cache[key] = [];
      var list = cache[key];
      var at = -1;
      for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(row.id)) { at = i; break; } }
      if (at === -1) list.unshift(row); else list[at] = row;
    }
    return open()
      .then(function (db) { return db.objectStoreNames.contains(key) ? putRow(db, key, row) : null; })
      .then(function () {
        patch(key, "insert", row);
        announce(key, "insert", row);
        return row;
      });
  }

  /** Drop one row from the cache and from every select that shows its list. */
  function remove(table, id) {
    var key = refKey(table);
    if (cache && cache[key]) cache[key] = cache[key].filter(function (r) { return String(r.id) !== String(id); });
    return open()
      .then(function (db) { return db.objectStoreNames.contains(key) ? deleteRow(db, key, id) : null; })
      .then(function () {
        patch(key, "remove", { id: id });
        announce(key, "remove", { id: id });
      });
  }

  function get(table) {
    var key = refKey(table);
    return cache ? (cache[key] || []).slice() : [];
  }

  /** `[{value,label,data}]` for a list, the shape a caller building its own control needs. */
  function optionsFor(table) {
    var key = refKey(table);
    var spec = TABLE_SPEC[key] || { label: "name" };
    return get(key).map(function (row) {
      var out = { value: String(row.id), label: String(row[spec.label] === undefined || row[spec.label] === null ? row.id : row[spec.label]) };
      if (spec.data) {
        out.data = {};
        for (var k in spec.data) if (Object.prototype.hasOwnProperty.call(spec.data, k)) out.data[k] = row[spec.data[k]];
      }
      return out;
    });
  }

  function pageVersion() {
    var meta = document.querySelector('meta[name="aa-refdb-version"]');
    var raw = meta ? meta.getAttribute("content") : "";
    var n = Number(raw);
    return raw !== "" && isFinite(n) ? n : 0;
  }

  function load() {
    return open().then(function (db) {
      return readMeta(db, "version").then(function (stored) {
        var version = pageVersion();
        // Use the cache when the page's data version is the one it was built from and every store is
        // present; otherwise refetch. `version` 0 means the page did not carry one — sync, do not
        // trust the cache.
        if (stored !== null && version !== 0 && Number(stored) === version) {
          return Promise.all(TABLES.map(function (t) { return readAll(db, t); })).then(function (lists) {
            var out = {};
            for (var i = 0; i < TABLES.length; i++) out[TABLES[i]] = lists[i];
            return { tables: out, fromCache: true };
          });
        }
        return fetch("/data/refs", { headers: { accept: "application/json" }, credentials: "same-origin" })
          .then(function (response) {
            if (!response.ok) throw new Error("refs " + response.status);
            return response.json();
          })
          .then(function (payload) {
            return replaceAll(db, payload.tables || {}, payload.version).then(function () {
              return { tables: payload.tables || {}, fromCache: false };
            });
          });
      });
    });
  }

  var ready = load()
    .then(function (result) {
      cache = result.tables;
      // When the cache matched the page's version, the server already rendered the same options from
      // the same fingerprint — rebuilding every select would duplicate that work. Rebuild only after
      // a refetch (a version change), where the server's markup may be from the previous version.
      if (!result.fromCache) applyAll();
      // Observable for tools/tests: did this page load read the cache or the network?
      try { document.documentElement.setAttribute("data-refdb-source", result.fromCache ? "cache" : "network"); } catch (e) { /* no document */ }
      return cache;
    })
    .catch(function (error) {
      // No IndexedDB, or the fetch failed. The server-rendered options stand, which is the whole
      // point of rule 1 — this is a degradation, not an error the user should see.
      if (typeof console !== "undefined" && console.warn) console.warn("refdb: using server-rendered options", error);
      return null;
    });

  // A change made in another tab is applied here too, so two tills do not disagree about a party.
  // `applyRemote` never re-announces, so two tabs cannot ping-pong the same change.
  if (channel) {
    channel.addEventListener("message", function (event) {
      var detail = event.data || {};
      if (!detail.table || !detail.row) return;
      applyRemote(detail.table, detail.action === "remove" ? "remove" : "insert", detail.row);
    });
  }

  window.__AA_REFDB__ = {
    ready: ready,
    refKey: refKey,
    get: get,
    optionsFor: optionsFor,
    upsert: upsert,
    remove: remove,
    applyAll: applyAll,
  };
})();
