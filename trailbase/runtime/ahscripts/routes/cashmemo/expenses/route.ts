// /cashmemo/expenses — the expenses list, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const filters = { from: routeKit.pick(query.from, ""), to: routeKit.pick(query.to, ""), q: routeKit.pick(query.q, "") };
    const [rows, totals] = await Promise.all([
      A.expenses.listExpenses(db, filters),
      A.expenses.sumExpenses(db, filters),
    ]);
    const editId = String(query.edit || "");

    return routeKit.renderRoute(
      req,
      { user, active: "cashmemo", title: "Expenses", template: "cashmemo/expenses.html" },
      {
        rows,
        filters,
        query,
        totals,
        editRow: editId ? rows.find((r: any) => String(r.id) === editId) ?? null : null,
        today: A.format.dateOnly(new Date().toISOString()),
      }
    );
  };
})();
