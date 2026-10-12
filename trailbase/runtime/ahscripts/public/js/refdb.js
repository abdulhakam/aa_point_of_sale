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

  // ⚠️ Bump this on any change to what refdb caches or the option spec it renders. It is stored with
  // the data version and compared on load, so a DEPLOY that changes the cache shape invalidates every
  // warm client even when the data fingerprint is unchanged. Without it a code change that adds/changes
  // an option `data-*` attribute would never reach a browser holding a warm cache.
  var CACHE_REV = 3;

  // The nine lists defined by app/sql/refs.sql. This is the IndexedDB store list, so it must be known
  // BEFORE the fetch (stores are created in `onupgradeneeded`). It is the ONE thing that stays a
  // client-side constant; the label/data spec and the source alias map are delivered by `/data/refs`
  // (below) so the client holds no second copy that could drift from the projection it consumes.
  var TABLES = ["parties", "items", "areas", "sections", "companies", "bookers", "partyTypes", "invoiceTypes", "paymentTypes"];

  // Populated from the `/data/refs` payload (and persisted in the meta store for the cache path).
  // `REF_ALIAS` maps a template's `data-ref` value to the refs key; `TABLE_SPEC` maps a refs key to its
  // `{label, data}` option spec. Both come from the server, which is the single source.
  var REF_ALIAS = {};
  var TABLE_SPEC = {};
  function adoptSpec(spec, alias) {
    if (alias) for (var a in alias) if (Object.prototype.hasOwnProperty.call(alias, a)) REF_ALIAS[a] = alias[a];
    if (spec) for (var t in spec) if (Object.prototype.hasOwnProperty.call(spec, t)) TABLE_SPEC[t] = spec[t];
  }
  function refKey(name) {
    var n = String(name || "");
    return REF_ALIAS[n] || n;
  }

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

  // The stored RECORD (`{key, value, rev, spec, alias}`), not just `.value`: the version, the cache
  // revision and the server spec all have to be readable from one lookup.
  function readMeta(db, key) {
    return new Promise(function (resolve, reject) {
      var request = db.transaction(META_STORE, "readonly").objectStore(META_STORE).get(key);
      request.onsuccess = function () { resolve(request.result || null); };
      request.onerror = function () { reject(request.error); };
    });
  }

  /** Replace every table, the stored version, the cache revision and the server spec in one transaction. */
  function replaceAll(db, tables, version, spec, alias) {
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
      tx.objectStore(META_STORE).put({ key: "version", value: version, rev: CACHE_REV, spec: spec || null, alias: alias || null });
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
    // A row that carries `name` but not the spec's label column (a partial row from a caller that did
    // not run the server projection) shows the name rather than its id — parties label on a computed
    // `label`, and a bare id is never the honest answer when a name is present.
    if ((label === undefined || label === null || label === "") && row.name !== undefined) label = row.name;
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
      var raw = row[spec.label];
      if ((raw === undefined || raw === null || raw === "") && row.name !== undefined) raw = row.name;
      var out = { value: String(row.id), label: String(raw === undefined || raw === null || raw === "" ? row.id : raw) };
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
      return readMeta(db, "version").then(function (record) {
        var version = pageVersion();
        // Use the cache only when the page's data version is the one it was built from, the CACHE_REV
        // still matches (so a code/spec deploy invalidates it), and every store is present. `version`
        // 0 means the page did not carry one — sync, do not trust the cache.
        var usable = record &&
          version !== 0 &&
          Number(record.value) === version &&
          Number(record.rev) === CACHE_REV;
        if (usable) {
          // The server spec travels with the cache, so the cache path uses the same label/data maps
          // the fetch path does — no client copy to drift.
          adoptSpec(record.spec, record.alias);
          return Promise.all(TABLES.map(function (t) { return readAll(db, t); })).then(function (lists) {
            var out = {};
            for (var i = 0; i < TABLES.length; i++) out[TABLES[i]] = lists[i];
            return { tables: out, fromCache: true, sameAsPage: true };
          });
        }
        return fetch("/data/refs", { headers: { accept: "application/json" }, credentials: "same-origin" })
          .then(function (response) {
            if (!response.ok) throw new Error("refs " + response.status);
            return response.json();
          })
          .then(function (payload) {
            adoptSpec(payload.spec, payload.alias);
            return replaceAll(db, payload.tables || {}, payload.version, payload.spec, payload.alias).then(function () {
              // The server already rendered its options from the SAME version this page carries, so the
              // DOM matches the fetched tables and a full rebuild would recreate identical nodes.
              var sameAsPage = version !== 0 && Number(payload.version) === version;
              return { tables: payload.tables || {}, fromCache: false, sameAsPage: sameAsPage };
            });
          });
      });
    });
  }

  var ready = load()
    .then(function (result) {
      cache = result.tables;
      // When the fetched version is the page's own version, the server already rendered the same
      // options from the same fingerprint, so rebuilding every select would duplicate that work.
      // Rebuild only when the markup may be from a different version (`!sameAsPage`).
      if (!result.fromCache && !result.sameAsPage) applyAll();
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

  /**
   * Re-check the page's data version and re-sync if it moved.
   *
   * Called by `app.js` after an htmx swap when the out-of-band `aa-refdb-version` meta changes — a
   * boosted nav carries the current version, and the cache must not keep serving the previous one.
   * Serialised behind the initial `ready` so it cannot race the first load. A version that already
   * matches the cache is a no-op (the server rendered the same options); a version that moved
   * re-fetches, replaces the store and rebuilds every annotated select.
   */
  function reload() {
    return ready
      .then(function () {
        return load().then(function (result) {
          if (!result) return result;
          cache = result.tables;
          if (!result.fromCache) applyAll();
          try { document.documentElement.setAttribute("data-refdb-source", result.fromCache ? "cache" : "network"); } catch (e) { /* no document */ }
          return result;
        });
      })
      .catch(function (error) {
        // No IndexedDB, or the fetch failed: the server-rendered options stand. A degradation, not an
        // error the user should see (rule 1).
        if (typeof console !== "undefined" && console.warn) console.warn("refdb: reload used server-rendered options", error);
        return null;
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
    reload: reload,
  };
})();
