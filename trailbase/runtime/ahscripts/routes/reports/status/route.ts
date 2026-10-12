// GET /reports/status — the report service status, from a route FOLDER (tb-0030 step 5).
//
// A literal folder, so it wins over the sibling `reports/{key}` report-page folder.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    return A.service.status();
  };
})();
