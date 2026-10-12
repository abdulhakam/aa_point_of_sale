// /cashmemo — the cash-memo hub, from a route FOLDER (tb-0030 step 5).
//
// The hub is a static five-tile grid ([[ui-parity-discrepancies-2026-10-08]]); it reads no data, so
// this route carries none. The old summary sums and date `filters` were removed with the tiles that
// rendered them — three aggregate queries per request for values nothing showed.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    return routeKit.renderRoute(
      req,
      { user, active: "cashmemo", title: "Cash memo", template: "cashmemo/index.html.jinja" },
      {}
    );
  };
})();
