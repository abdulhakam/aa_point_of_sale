// /payments/new — the new-payment screen, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    // One builder, shared with the create route's error path so a rejected payment re-renders this
    // same form with the operator's values.
    const view = await A.payments.newView(A, req, query, "");
    return routeKit.renderRoute(req, { user, ...view.options }, view.data);
  };
})();
