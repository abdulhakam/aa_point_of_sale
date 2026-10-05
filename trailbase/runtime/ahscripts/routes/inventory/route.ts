// /inventory — the stock list, from a route FOLDER (tb-0030 step 5).
//
// Only the exact GET `/inventory` is owned here. `/inventory/save` still falls through to the dispatcher.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const refs = await routeKit.refs();
    const rows = A.inventory.stockRows(await A.baseviews.itemsReport(), refs, routeKit.pick(query.q, ""));
    const editId = String(query.edit || "");

    return routeKit.renderRoute(
      req,
      { user, active: "inventory", title: "Inventory", template: "inventory/index.html" },
      {
        rows,
        query: routeKit.pick(query.q, ""),
        summary: A.inventory.stockSummary(rows),
        editRow: editId ? rows.find((r: any) => String(r.id) === editId) ?? null : null,
        companies: (refs.companies ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      }
    );
  };
})();
