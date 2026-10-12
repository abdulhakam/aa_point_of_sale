// GET /jobs/<id>/result — a job's state, result and artifacts, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/jobs\/([^/]+)\/result$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    if (query.reconcile !== "0") await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, routeKit.b64ToHex(match[1]));
    if (!view) return { text: "No such job", status: 404 };
    return { state: view.state, result: view.result, artifacts: view.artifacts };
  };
})();
