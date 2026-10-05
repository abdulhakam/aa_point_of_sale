// /cashmemo/da — the DA (daily) entry view, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const filters = { from: routeKit.pick(query.from, ""), to: routeKit.pick(query.to, ""), standalone: "on" };
    const [rows, totals] = await Promise.all([
      A.payments.listPayments(db, filters),
      A.payments.sumPayments(db, filters),
    ]);

    return routeKit.renderRoute(
      req,
      { user, active: "cashmemo", title: "DA entry", template: "cashmemo/da.html" },
      {
        rows,
        filters,
        query,
        totals: { recievedText: totals.recievedText, sentText: totals.sentText },
      }
    );
  };
})();
