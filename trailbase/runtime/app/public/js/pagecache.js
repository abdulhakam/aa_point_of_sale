/*
 * pagecache — cache rendered page fragments in IndexedDB, keyed on the live data version.
 *
 * WHY. The shell survives a boosted nav and only `#app-main` is swapped, but every nav still fetches
 * its fragment from the server. The server already avoids re-RENDERING an unchanged page
 * ([[rendered-page-cache]]); this avoids re-SENDING it. A page visited while the data version is
 * unchanged is served from the client cache with no request at all.
 *
 * ── Rules it will not break ───────────────────────────────────────────────────────────────────────────
 *
 * 1. **Freshness is fingerprint-keyed, never a TTL** ([[reports.no_precomputation]]). A page is cached
 *    under `(CACHE_REV, viewing identity, data version, url)`; when the version moves it is never
 *    served again. Writes clear the cache immediately, `BroadcastChannel` clears other tabs, and a
 *    cheap `/data/version` probe clears it when another device changed something
 *    ([[guest-fingerprint-refresh]]). The identity is in the key so a shared browser cannot serve one
 *    user's page to another, and the cache is dropped on the login screen.
 * 2. **It is transparent to htmx.** The decision is made in `htmx:beforeRequest` (synchronous, so the
 *    store is mirrored in memory) and a hit is served by `preventDefault()` + the same swap htmx would
 *    have done: `hx-swap-oob` meta applied, `#app-main` replaced, URL pushed, and an `htmx:afterSwap`
 *    event dispatched so `app.js` re-enhances exactly as on a real swap. A miss is left entirely to htmx.
 * 3. **The version can be EMPTY in the page meta.** `dataVersionIfWarm()` returns "" until the report
 *    service's memo is warm, so the cache keeps its own `state` and seeds the version from
 *    `/data/version` when the meta is blank (and refreshes it on the probe).
 * 4. **The key is the DATA version, not the code revision.** `runtimeRevision()` was intended as a
 *    second key component, but it is observed to change on every request in this environment (see
 *    [[runtime-revision-is-unstable]]), so keying on it would never hit. A code-only change is instead
 *    caught by `CACHE_REV` (bumped when this file's contract changes) — weaker than a content hash, and
 *    recorded as such in [[guest-page-cache]].
 * 5. **No JavaScript, or any error, changes nothing.** The server-rendered page is the fallback.
 */
(function () {
  "use strict";

  var DB_NAME = "aa-pos-pagecache";
  var DB_VERSION = 1;
  var STORE = "pages";
  var META_STORE = "meta";

  // ⚠️ Bump on any change to what a cached entry means or to the swap this performs, so a deploy
  // invalidates every warm client.
  var CACHE_REV = 1;
  var MAX_ENTRIES = 60;
  var PROBE_MS = 30000;

  var memory = null;   // key -> html, mirrors the store so `htmx:beforeRequest` can decide synchronously
  var state = { version: "", identity: "" };
  var dbPromise = null;
  var channel = null;
  try {
    if (typeof BroadcastChannel === "function") channel = new BroadcastChannel("aa-pagecache");
  } catch (e) {
    channel = null;
  }

  function metaContent(name) {
    var el = document.getElementById(name);
    return el ? el.getAttribute("content") || "" : "";
  }

  /** Seed `state` from the page meta; if it is blank, ask `/data/version`. */
  function refreshState() {
    state.identity = metaContent("aa-user"); // per-identity: a shared browser must not cross users
    var version = metaContent("aa-refdb-version");
    if (version) { state.version = version; return Promise.resolve(); }
    return fetch("/data/version", { headers: { "X-Requested-With": "XMLHttpRequest" }, credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (p) {
        if (p && p.version !== undefined && p.version !== null && String(p.version) !== "") state.version = String(p.version);
      })
      .catch(function () { /* offline/unauth: no key, so nothing is cached or served */ });
  }

  /** Update `state` from a fragment's own OOB meta (the version that response was rendered with). */
  function adoptFromHtml(html) {
    var version = (html.match(/name="aa-refdb-version" content="([^"]*)"/) || [])[1];
    if (version) state.version = version;
  }

  /** The one cache key shape. `null` when the version is not yet known — then do not cache. */
  function keyFor(href) {
    if (!state.version) return null;
    try {
      var url = new URL(href, location.href);
      if (url.origin !== location.origin) return null;
      return CACHE_REV + "|" + state.identity + "|" + state.version + "|" + url.pathname + url.search;
    } catch (e) {
      return null;
    }
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
    return dbPromise;
  }

  function readAll(db) {
    return new Promise(function (resolve, reject) {
      var request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = function () { resolve(request.result || []); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function putRecord(db, record) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
      tx.objectStore(STORE).put(record);
    });
  }

  function clearStore(db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = function () { reject(tx.error); };
      tx.objectStore(STORE).clear();
    });
  }

  function prune(db) {
    return readAll(db).then(function (records) {
      if (records.length <= MAX_ENTRIES) return;
      records.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      var stale = records.slice(MAX_ENTRIES);
      var tx = db.transaction(STORE, "readwrite");
      var store = tx.objectStore(STORE);
      for (var i = 0; i < stale.length; i++) store.delete(stale[i].id);
      return new Promise(function (resolve) { tx.oncomplete = resolve; });
    });
  }

  var ready = open()
    .then(function (db) { return readAll(db); })
    .then(function (records) {
      memory = {};
      for (var i = 0; i < records.length; i++) memory[records[i].id] = records[i].html;
      return refreshState();
    })
    .then(function () {
      // On the login screen there is no session, so nothing may be kept: a logged-out browser must not
      // hand the previous user's cached pages to the next login.
      if (location.pathname.indexOf("/login") === 0) invalidate(false);
      try { document.documentElement.setAttribute("data-pagecache", "ready"); } catch (e) { /* no document */ }
      return memory;
    })
    .catch(function (error) {
      if (typeof console !== "undefined" && console.warn) console.warn("pagecache: disabled", error);
      memory = {};
      return memory;
    });

  function remember(key, html) {
    if (!memory) memory = {};
    memory[key] = html;
    open()
      .then(function (db) { return putRecord(db, { id: key, html: html, at: Date.now() }).then(function () { return prune(db); }); })
      .catch(function () { /* best effort */ });
  }

  /** Drop every cached page — the data has moved (this or another tab). */
  function invalidate(announce) {
    if (memory) memory = {};
    open().then(clearStore).catch(function () { /* best effort */ });
    try { document.documentElement.removeAttribute("data-pagecache-stale"); } catch (e) { /* no document */ }
    if (announce && channel) { try { channel.postMessage({ clear: true }); } catch (e) { /* closed */ } }
  }

  // ── the swap htmx would have done, minus the network ─────────────────────────────────────────────

  function isCacheableNav(elt) {
    if (!elt || elt.tagName !== "A") return false;
    if (elt.hasAttribute("download") || elt.target === "_blank") return false;
    if (elt.hasAttribute("hx-boost") && elt.getAttribute("hx-boost") === "false") return false;
    var boost = elt.closest ? elt.closest('[hx-boost]') : null;
    if (boost && boost.getAttribute("hx-boost") === "false") return false;
    if (!boost && !elt.hasAttribute("hx-boost")) return false; // only boosted links are fragment navs
    if (!elt.href) return false;
    try { return new URL(elt.href, location.href).origin === location.origin; } catch (e) { return false; }
  }

  function applyFragment(href, html, elt) {
    var target = document.getElementById("app-main");
    if (!target) return false;
    var tpl = document.createElement("template");
    tpl.innerHTML = html;
    var oob = tpl.content.querySelectorAll("[hx-swap-oob]");
    for (var i = 0; i < oob.length; i++) {
      var node = oob[i];
      var spec = node.getAttribute("hx-swap-oob") || "";
      var match = /^(outerHTML|innerHTML):(#[\w-]+)$/.exec(spec);
      if (match) {
        var dest = document.querySelector(match[2]);
        if (dest) {
          if (match[1] === "outerHTML") dest.replaceWith(node.cloneNode(true));
          else dest.innerHTML = node.innerHTML;
        }
      }
      node.remove();
    }
    target.innerHTML = tpl.innerHTML;
    if (window.htmx && typeof window.htmx.process === "function") {
      try { window.htmx.process(target); } catch (e) { /* htmx not ready */ }
    }
    try { history.pushState({ aaPageCache: true }, "", href); } catch (e) { /* about:blank etc. */ }
    try {
      target.dispatchEvent(new CustomEvent("htmx:afterSwap", { bubbles: true, detail: { target: target, elt: elt } }));
    } catch (e) { /* CustomEvent unavailable */ }
    return true;
  }

  // ── the hooks ─────────────────────────────────────────────────────────────────────────────────────

  // Serve a cache hit by intercepting the CLICK, before htmx's boost handler sees it. Cancelling
  // `htmx:beforeRequest` was tried first and does not stop the request for a boosted link (htmx 2.0.4
  // returns early on a cancelled beforeRequest only on some paths); a capture click listener with
  // `stopImmediatePropagation` means htmx never issues the request at all. A miss is left untouched.
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var anchor = event.target && event.target.closest ? event.target.closest("a") : null;
    if (!isCacheableNav(anchor)) return;
    var key = keyFor(anchor.href);
    if (!key || !memory || !memory[key]) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyFragment(new URL(anchor.href, location.href).href, memory[key], anchor);
  }, true);

  // The request verb is not on `htmx:afterRequest` and (for a boosted link) `detail.elt` is not
  // reliably the anchor, so record it against the xhr here and read the response URL there.
  var verbByXhr = typeof WeakMap === "function" ? new WeakMap() : null;
  document.addEventListener("htmx:beforeRequest", function (event) {
    if (!verbByXhr) return;
    var detail = event.detail || {};
    var xhr = detail.xhr, elt = detail.elt;
    if (!xhr) return;
    var verb = (detail.requestConfig && detail.requestConfig.verb) ||
      (elt && elt.tagName === "FORM" ? (elt.getAttribute("method") || "get") :
        (elt && elt.getAttribute ? (elt.getAttribute("hx-post") ? "post" : elt.getAttribute("hx-put") ? "put" : elt.getAttribute("hx-delete") ? "delete" : "get") : "get"));
    try { verbByXhr.set(xhr, String(verb).toLowerCase()); } catch (e) { /* ignore */ }
  }, true);

  document.addEventListener("htmx:afterRequest", function (event) {
    var detail = event.detail || {};
    var xhr = detail.xhr;
    if (!xhr) return;
    var verb = "get";
    try { verb = (verbByXhr && verbByXhr.get(xhr)) || "get"; } catch (e) { /* ignore */ }
    var body = typeof xhr.responseText === "string" ? xhr.responseText : "";
    if (verb === "get") {
      // A GET whose body is a page fragment is a navigation: cache it under its own response URL.
      // A GET of anything else (a JSON status/probe endpoint) is not a page and must NOT invalidate.
      if (xhr.status === 200 && body.indexOf("aa-refdb-version") >= 0) {
        adoptFromHtml(body);
        var key = keyFor(xhr.responseURL || (detail.elt && detail.elt.href) || "");
        if (key) remember(key, body);
      }
      return;
    }
    // A non-GET htmx request is a write. The background job poller and the manual refresh use plain
    // `fetch` (app.js), so they never reach here — every non-GET seen here changed data. Drop the cache.
    if (detail.successful !== false) invalidate(true);
  }, true);

  // ── invalidation from elsewhere ───────────────────────────────────────────────────────────────────

  if (channel) {
    channel.addEventListener("message", function (event) {
      if (event.data && event.data.clear) invalidate(false); // do not re-announce
    });
  }

  var lastProbe = 0;
  function probe() {
    var now = Date.now();
    if (now - lastProbe < 3000) return;
    lastProbe = now;
    fetch("/data/version", { headers: { "X-Requested-With": "XMLHttpRequest" }, credentials: "same-origin", cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        if (!payload) return;
        var version = payload.version === undefined || payload.version === null ? "" : String(payload.version);
        if (version && version !== state.version) {
          state.version = version;
          invalidate(true);
          try { document.documentElement.setAttribute("data-pagecache-stale", "1"); } catch (e) { /* no document */ }
        }
      })
      .catch(function () { /* offline or unauth: leave the cache as-is */ });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") probe();
  });
  setInterval(probe, PROBE_MS);

  window.__AA_PAGECACHE__ = {
    ready: ready,
    invalidate: function () { invalidate(true); },
    keyFor: keyFor,
    size: function () { return memory ? Object.keys(memory).length : 0; },
    keys: function () { return memory ? Object.keys(memory) : []; },
    state: function () { return { version: state.version }; },
  };
})();
