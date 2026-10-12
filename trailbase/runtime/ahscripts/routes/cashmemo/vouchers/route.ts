// /cashmemo/vouchers — the standalone payment vouchers, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const type = routeKit.pick(query.type, "0") === "1" ? "1" : routeKit.pick(query.type, "0") === "2" ? "2" : "0";
    const filters = { type, from: routeKit.pick(query.from, ""), to: routeKit.pick(query.to, ""), standalone: "on" };
    const [rows, totals] = await Promise.all([
      A.payments.listPayments(db, filters),
      A.payments.sumPayments(db, filters),
    ]);

    return routeKit.renderRoute(
      req,
      { user, active: "cashmemo", title: "Vouchers", template: "cashmemo/vouchers.html.jinja" },
      {
        rows,
        filters,
        query,
        selectedType: Number(type),
        typeLabel: type === "1" ? "Receive" : type === "2" ? "Return" : "Payment",
        totals: { totalText: totals.netText },
      }
    );
  };
})();
