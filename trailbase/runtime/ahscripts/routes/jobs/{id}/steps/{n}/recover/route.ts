// POST /jobs/<id>/steps/<n>/recover — recover one job step, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/jobs\/([^/]+)\/steps\/([0-9]+)\/recover$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    await A.jobs.recoverStep(db, routeKit.b64ToHex(match[1]), Number(match[2]));
    return { ok: true };
  };
})();
