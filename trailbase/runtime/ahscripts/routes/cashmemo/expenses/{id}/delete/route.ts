// POST /cashmemo/expenses/<id>/delete — delete an expense, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/cashmemo\/expenses\/([^\/]+)\/delete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };

    await routeKit.write(() => A.expenses.deleteExpense(db, String(match[1])));
    return { redirect: "/cashmemo/expenses?status=ok", status: 303 };
  };
})();
