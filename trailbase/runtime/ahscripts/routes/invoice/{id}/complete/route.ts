// POST /invoice/<id>/complete — complete one invoice over the JSON API, from a route FOLDER
// (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoice\/([^/]+)\/complete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const hex = routeKit.b64ToHex(match[1]);
    const userHex = routeKit.userHex(req);
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
    const completed = await routeKit.write(() => A.invoicing.completeInvoice(db, hex, userHex, true));
    return { completed };
  };
})();
