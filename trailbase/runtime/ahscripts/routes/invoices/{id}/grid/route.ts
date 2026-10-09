// GET /invoices/<id>/grid — the grid entry screen, from a route FOLDER (tb-0030 step 5).
//
// Reading is unconditional; writing needs the lease. The grid shows who holds it rather than presenting
// a dead form ([[single-writer-per-invoice]]).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoices\/([^\/]+)\/grid$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    // One builder, shared with the grid save (`/invoices/<id>/lines`) so an htmx save renders the same
    // screen this GET does. `canWrite`/`heldBy` (the lease) are resolved inside it.
    const view = await A.invoices.gridView(A, req, match[1], "", "");
    if (!view) return { text: "No such invoice", status: 404 };
    return routeKit.renderRoute(req, { user, ...view.options }, view.data);
  };
})();
