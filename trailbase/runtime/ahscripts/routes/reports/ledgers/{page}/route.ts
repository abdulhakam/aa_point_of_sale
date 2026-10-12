// /reports/ledgers/<page> — a ledger report page, from a route FOLDER (tb-0030 step 5).
//
// A report key can contain a slash: a ledger page's key is `ledgers/<page>`. The `{key}` folder sits at
// the `reports/` level and matches a single segment, so once the host matches the literal `ledgers`
// folder it never consults `{key}` for `ledgers/<page>`. This `{page}` folder is what serves them.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/reports\/(.+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const key = match[1];
    const pageDef = (await A.pages.reportPages("/ahscripts/pages"))[key];
    if (!pageDef || !(await A.spooled.names()).includes(key)) return { text: "Not found", status: 404 };

    return A.reportRender.renderReportPage(A, db, req, user, path, query, key, pageDef);
  };
})();
