// /reports/ledgers — the ledger hub, from a route FOLDER (tb-0030 step 5).
//
// The literal `ledgers` folder wins over a future `reports/{key}` param folder by the host's stated
// precedence (literal, then `{param}`, then `[...rest]`), so a ledger hub can never be shadowed by the
// report-page family. A ledger page (`/reports/ledgers/general`) still falls through to the dispatcher.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const hub = await A.pages.hubIndex("/app/pages");
    return routeKit.renderRoute(
      req,
      { user, active: "reports", title: "Ledgers", template: "reports/ledgers/index.html.jinja" },
      { tiles: hub.ledgers }
    );
  };
})();
