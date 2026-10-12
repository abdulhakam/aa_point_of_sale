// GET /invoice-doc/<id> — one whole document by path id, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoice-doc\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const doc = await A.invoiceDoc.read(routeKit.decode(match[1]));
    if (!doc) return { text: "No such invoice document", status: 404 };
    return doc;
  };
})();
