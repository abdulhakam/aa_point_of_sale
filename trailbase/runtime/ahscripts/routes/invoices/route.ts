// /invoices — the invoice HUB, from a route FOLDER (tb-0030 step 5).
//
// Only the exact GET `/invoices` is owned here; `/invoices/new`, `/invoices/all` and `/invoices/<id>/…`
// resolve to their own folders first. The legacy hub is five tiles and reads no data, so neither does
// this. The list it used to show lives at `/invoices/all`.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    return routeKit.renderRoute(
      req,
      { user, active: "invoices", title: "Invoices", template: "invoices/index.html" },
      {}
    );
  };
})();
