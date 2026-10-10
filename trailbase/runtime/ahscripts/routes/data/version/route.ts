// GET /data/version — the tiny data-version fingerprint for the CLIENT page cache.
//
// `pagecache.js` holds rendered fragments in IndexedDB keyed on `(CACHE_REV, version, url)`. It learns
// that another tab or device changed the data from this endpoint: on tab focus and on a slow interval
// it asks here; a moved `version` clears the cache, so the next nav re-fetches. The body is one number,
// far cheaper than fetching a page, and `If-None-Match` answers 304 when nothing moved. The caller's own
// writes clear the cache directly and do not need the probe.
//
// This is the client-side counterpart to the server's rendered-page cache, which keys on the same
// fingerprint ([[rendered-page-cache]]); see [[guest-page-cache]] for the client store.
//
// ⚠️ Not the code revision. `runtimeRevision()` was intended here too, but it is observed to change on
// every request in this environment ([[runtime-revision-is-unstable]]), so it is not exposed. A code-only
// change is caught by bumping `CACHE_REV` in pagecache.js instead.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    // `dataVersion` probes the tables (memoised ~1.5 s), so this answers the current fingerprint.
    const version = await A.service.dataVersion();
    const etag = `W/"pagecache-${version}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    const contentType = "application/json; charset=utf-8";
    if (String((req.headers && req.headers["if-none-match"]) || "") === etag) {
      return { status: 304, body: "", contentType, headers };
    }
    return { body: JSON.stringify({ version }), contentType, headers };
  };
})();
