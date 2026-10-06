// POST /vaulter-lite/regenerate — generate/refresh the document store (tb-0034).
//
// The documents are uploaded through the record API (`/api/records/v1/documents`), because the object
// store is not writable from the guest any other way. This forwards the TRIGGERING request's auth
// (its cookie or bearer header) so the upload is authorised as the same user.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    const headers: Record<string, string> = {};
    const h = req.headers || {};
    if (h.cookie) headers.cookie = String(h.cookie);
    if (h.authorization) headers.authorization = String(h.authorization);

    const mod = await (globalThis as any).__AA_LOAD__("/app/lib/vaulter-lite.js");
    return await mod.generate(A, db, { full: query.full === "1", origin, headers });
  };
})();
