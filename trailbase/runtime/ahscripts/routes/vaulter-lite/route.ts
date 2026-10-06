// GET /vaulter-lite — the store's last-run report, from a route FOLDER (tb-0034).
// Read from `_meta.json` in the store, so it reflects the last init or hourly run.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const mod = await (globalThis as any).__AA_LOAD__("/app/lib/vaulter-lite.js");
    return (await mod.status()) || { lastRun: null, collections: {} };
  };
})();
