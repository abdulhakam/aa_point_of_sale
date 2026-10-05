// POST /reports/refresh — refresh the report fingerprint, from a route FOLDER (tb-0030 step 5).
//
// A literal folder, so it wins over the sibling `reports/{key}` report-page folder. It answers
// application/json (the poller) with the status, and a browser form post with a redirect back.
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

    const full = query.full === "1" || query.full === "on" || form.full === "1" || form.full === "on";
    // `full` also drops the composed-SQL cache, or an edited `.sql` file would keep serving the
    // text that was composed when the process first read it.
    if (full) {
      await A.service.invalidate();
      A.spooled.invalidate();
    }
    await A.service.refresh(db);
    const accept = String((req.headers && req.headers.accept) || "");
    if (accept.includes("application/json")) return A.service.status();
    const referer = String((req.headers && req.headers.referer) || "");
    const back = referer ? referer.replace(/^https?:\/\/[^/]+/, "") : "/dashboard";
    return { redirect: back || "/dashboard", status: 303 };
  };
})();
