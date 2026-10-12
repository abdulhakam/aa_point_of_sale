// /dashboard — the landing tiles, from a route FOLDER (tb-0030 step 5).
//
// The auth gate is the folder's own: the dispatcher gated every authenticated route before its
// branches, and a folder bypasses the dispatcher. See `app/lib/route-kit.js` `userOf`/`loginRedirect`.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    // The legacy dashboard is the six tiles and nothing else ([[ui-parity-discrepancies-2026-10-08]]);
    // the "Overview" counters card is gone, so `counts()` and the array it fed are not computed.
    return routeKit.renderRoute(
      req,
      { user, active: "dashboard", title: "Dashboard", template: "dashboard/page.html.jinja" },
      {}
    );
  };
})();
