// GET /invoice-doc/document — one whole document by query id, from a route FOLDER (tb-0030 step 5).
//
// `id` is base64, and `=` inside a path segment is fragile through the router, so the query parameter
// is the supported form for a base64 id. The path form in the sibling `{id}` folder is for `inv-<no>`
// and for hex.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const doc = await A.invoiceDoc.read(query.id || query.readableId || "");
    if (!doc) return { text: "No such invoice document", status: 404 };
    return doc;
  };
})();
