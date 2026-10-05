// POST /jobs/reconcile — run due queue work, from a route FOLDER (tb-0030 step 5).
//
// ⚠️ This folder is NOT the only implementation: the host's poller calls the dispatcher FILE directly
// for this path (see tb-0030), so the dispatcher keeps a branch that calls the same `routeKit.jobsReconcile`.
// A literal folder so it also wins over the `{id}` sibling, which would otherwise shadow it.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const form = routeKit.parsePairs(String(req.body || ""));
    return routeKit.jobsReconcile(A, db, req, query, form);
  };
})();
