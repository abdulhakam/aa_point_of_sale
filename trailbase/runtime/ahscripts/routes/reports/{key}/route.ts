// /reports/<key> — a report page, from a route FOLDER (tb-0030 step 5).
//
// The `{key}` matches a single path segment. A multi-segment report key (`ledgers/area` is one) does
// NOT reach here: once the host matches the literal `ledgers` folder it commits to descending into it,
// so `/reports/ledgers/<page>` falls through to the dispatcher. The literal `status`, `refresh` and
// `ledgers` folders also win over this one at their own paths.
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
    // The manifest is the ONE page definition: `/reports/<key>` and `/p/<slug>` both read it, so a
    // report cannot be defined twice and drift.
    const pageDef = (await A.pages.reportPages("/ahscripts/pages"))[key];
    // The spool registry decides what exists: the SQL is what a report IS.
    if (!pageDef || !(await A.spooled.names()).includes(key)) return { text: "Not found", status: 404 };

    return A.reportRender.renderReportPage(A, db, req, user, path, query, key, pageDef);
  };
})();
