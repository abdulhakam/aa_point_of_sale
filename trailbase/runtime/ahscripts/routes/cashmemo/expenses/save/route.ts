// POST /cashmemo/expenses/save — create or update an expense, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    try {
      await routeKit.write(() =>
        String(form.id || "") ? A.expenses.updateExpense(db, String(form.id), form) : A.expenses.createExpense(db, form)
      );
      return { redirect: "/cashmemo/expenses?status=ok", status: 303 };
    } catch (e: any) {
      return { text: "Expense not saved: " + (e && e.message ? e.message : String(e)), status: 400 };
    }
  };
})();
