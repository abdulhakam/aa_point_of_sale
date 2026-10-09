// GET /invoices/<id> — the invoice entry screen (the older form-and-list view), from a route FOLDER
// (tb-0030 step 5). The grid at `/invoices/<id>/grid` is the newer entry screen; this is kept until the
// grid has been exercised end to end.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/invoices\/([^\/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    // One builder, shared with the entry writes (line add/remove, header, complete) so an htmx write
    // renders the same screen this GET does.
    const view = await A.invoices.entryView(A, match[1], query.status === "ok" ? "Saved" : "");
    if (!view) return { text: "No such invoice", status: 404 };
    return routeKit.renderRoute(req, { user, ...view.options }, view.data);
  };
})();
