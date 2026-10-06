// POST /vaulter-lite/regenerate — generate/refresh the filesystem document store (tb-0034).
// `?full=1` rewrites every row (a repair); otherwise only dirty rows are rewritten. Admin-gated.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const mod = await (globalThis as any).__AA_LOAD__("/app/lib/vaulter-lite.js");
    return await mod.generate(A, db, { full: query.full === "1" });
  };
})();
