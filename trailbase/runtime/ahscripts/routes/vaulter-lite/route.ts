// GET /vaulter-lite — the document store's contents by collection, from a route FOLDER (tb-0034).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const mod = await (globalThis as any).__AA_LOAD__("/ahscripts/lib/vaulter-lite.js");
    return await mod.status(db);
  };
})();
