/*
 * The invoice lookup cache — the slice the reference cache deferred
 * ([[reference-lists-come-from-indexeddb]], "It gets its own slice").
 *
 * WHY. The payment form's invoice picker must list every invoice. Rendering ~8,900 <option>s into
 * every `/payments/new` response was ~0.9 MB of inline HTML. This caches the invoice lookup rows in
 * IndexedDB (loaded lazily, only when a page has an invoice picker) against the same data version the
 * reference cache uses, and populates the picker from it — so the server renders only a small fallback
 * and the full list comes from the client store.
 *
 * Progressive enhancement: with this file absent the server-rendered fallback stands; nothing here is
 * required to read or submit a page. It mirrors `refdb.js` (same version signal, same `refdb:select`
 * event so an already-built combobox re-reads the options, same "the cache is never allowed to
 * validate a write" rule — the server still checks ids).
 */
(function () {
  "use strict";

  var DB = "aa-pos-invoices";
  var DB_VERSION = 1;
  var STORE = "invoices";
  var META = "meta";

  var cache = null; // in-memory copy for the life of the page

  /** The page's data version, the SAME signal refdb uses (the head meta the fragment keeps in sync). */
  function pageVersion() {
    var meta = document.getElementById("aa-refdb-version");
    return meta ? (meta.getAttribute("content") || "") : "";
  }
  function source(name) {
    try { document.documentElement.setAttribute("data-invoicedb-source", name); } catch (e) { /* no document */ }
  }

  function open() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "k" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function readCache(db, version) {
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction([STORE, META], "readonly");
        var metaReq = tx.objectStore(META).get("version");
        metaReq.onsuccess = function () {
          var stored = metaReq.result && metaReq.result.v;
          if (version === "" || String(stored) !== String(version)) return resolve(null);
          var all = tx.objectStore(STORE).getAll();
          all.onsuccess = function () { resolve(all.result && all.result.length ? all.result : null); };
          all.onerror = function () { resolve(null); };
        };
        metaReq.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function writeCache(db, version, rows) {
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction([STORE, META], "readwrite");
        var store = tx.objectStore(STORE);
        store.clear();
        for (var i = 0; i < rows.length; i++) store.put(rows[i]);
        tx.objectStore(META).put({ k: "version", v: version });
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  }

  function setVersionMeta(version) {
    // Keep the head meta current so a later page in this tab uses the cache without a request.
    var meta = document.getElementById("aa-refdb-version");
    if (meta && version) meta.setAttribute("content", String(version));
  }

  /** Load the invoice list: from the IndexedDB cache when the version matches, else from the server. */
  function load() {
    if (cache) return Promise.resolve(cache);
    var version = pageVersion();
    return open()
      .then(function (db) {
        return readCache(db, version).then(function (rows) {
          if (rows) { cache = rows; source("cache"); return rows; }
          return fetch("/data/invoices", { headers: { accept: "application/json" } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (payload) {
              if (!payload || !payload.invoices) { source("network"); return null; }
              cache = payload.invoices;
              setVersionMeta(payload.version);
              return writeCache(db, String(payload.version || ""), cache).then(function () { source("network"); return cache; });
            });
        });
      })
      .catch(function (error) {
        // No IndexedDB / fetch failed: the server-rendered fallback stands. Degradation, not an error.
        if (typeof console !== "undefined" && console.warn) console.warn("invoicedb: server-rendered options stand", error);
        return null;
      });
  }

  function scope() {
    var s = window.__AA_SETTINGS__;
    return (s && s.get("invoicePickerScope")) || "all";
  }

  /** Rebuild a picker's options from the cached invoices, honouring the scope setting. */
  function populate(select, invoices) {
    var open = scope() === "open";
    // Keep the server-authored blank option (its label differs per screen: "None — standalone DA entry").
    var blank = select.querySelector('option[value=""]');
    blank = blank ? blank.cloneNode(true) : (function () { var o = document.createElement("option"); o.value = ""; return o; })();

    var keep = select.value;
    var frag = document.createDocumentFragment();
    frag.appendChild(blank);
    for (var i = 0; i < invoices.length; i++) {
      var inv = invoices[i];
      var paid = Number(inv.paid) > 0;
      if (open && paid) continue;
      var o = document.createElement("option");
      o.value = inv.id;
      o.setAttribute("data-paid", paid ? "1" : "0");
      o.textContent = "#" + inv.invoiceNo + (inv.partyName ? " \u00b7 " + inv.partyName : "") + (inv.balanceText ? " \u00b7 " + inv.balanceText : "");
      frag.appendChild(o);
    }
    select.textContent = "";
    select.appendChild(frag);
    if (keep) select.value = keep;
    // The select is `.ac-native` and hidden once autocomplete has built its combobox; `refdb:select`
    // makes that combobox re-read its options, so the open list and search use the new set in place.
    select.dispatchEvent(new Event("refdb:select", { bubbles: true }));
  }

  function enhanceAll(root) {
    var picks = (root || document).querySelectorAll("select[data-invoice-picker]");
    if (!picks.length) return;
    load().then(function (invoices) {
      if (!invoices) return;
      for (var i = 0; i < picks.length; i++) populate(picks[i], invoices);
    });
  }

  window.__AA_INVOICEDB__ = { enhanceAll: enhanceAll, load: load };

  // The scope setting changes which invoices a picker shows; repopulate from the in-memory cache.
  document.addEventListener("aa-settings:change", function () { enhanceAll(document); });

  function init() { enhanceAll(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
