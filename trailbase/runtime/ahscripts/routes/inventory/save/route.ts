// /inventory/save — create or update an item, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    // Reject a body that omits a required field BEFORE the write. Without this an empty POST inserted
    // an item with `name = ''` and redirected `303 ?status=ok` — the table's `name TEXT NOT NULL
    // DEFAULT ''` was satisfied, and the junk item then showed up in the inventory, the stock report
    // and the difference report. `createRow` now also enforces this, so the check here is what turns
    // the refusal into a 400 rather than an unhandled 500.
    const missing = A.management.missingRequired(A.entities.ENTITIES.items, form);
    if (missing.length) return { error: "missing required fields", fields: missing };

    await routeKit.write(() =>
      String(form.id || "")
        ? A.inventory.updateItem(db, "items", String(form.id), form)
        : A.management.createRow(db, A.entities.ENTITIES.items, form)
    );
    return { redirect: "/inventory?status=ok", status: 303 };
  };
})();
