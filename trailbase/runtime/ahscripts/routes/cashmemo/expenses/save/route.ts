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
      // htmx save: re-render the expenses list (flash included) into `#app-main`; a plain POST still 303s.
      if (A.http.isFragment(req)) {
        const view = await A.expenses.listView(A, req, {}, "ok", "Saved");
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { redirect: "/cashmemo/expenses?status=ok", status: 303 };
    } catch (e: any) {
      const why = e && e.message ? e.message : String(e);
      // htmx error: re-render the list with the message as a red flash, rather than a bare 400 body
      // htmx would not swap.
      if (A.http.isFragment(req)) {
        const view = await A.expenses.listView(A, req, {}, "error", "Expense not saved: " + why);
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { text: "Expense not saved: " + why, status: 400 };
    }
  };
})();
