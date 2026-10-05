// GET /invoice-doc/list — document summaries, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    return await A.invoiceDoc.list({
      type: query.type,
      party: query.party,
      booker: query.booker,
      completed: query.completed,
      datedFrom: query.datedFrom,
      datedTo: query.datedTo,
      unpaid: query.unpaid,
      orderBy: query.orderBy,
      order: query.order,
      limit: query.limit,
      offset: query.offset,
    });
  };
})();
