// POST /invoices/<id>/line/<lineId>/delete — remove one line, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoices\/([^\/]+)\/line\/([^\/]+)\/delete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(idB64));
    const userHex = routeKit.userHex(req);

    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
    await routeKit.write(async () => {
      await A.invoicing.deleteLine(db, routeKit.b64ToHex(String(match[2])));
    });
    return { redirect: "/invoices/" + idB64 + "?status=ok", status: 303 };
  };
})();
