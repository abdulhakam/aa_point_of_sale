// GET /print/queue — the legacy print-queue page, from a route FOLDER.
//
// The queue is held in the browser's `localStorage` (key `print-queue`), keyed by the invoice ids the
// operator added from the sheet. That is client state, so the page cannot read it server-side: the
// client (`app/public/js/print-queue.js`) puts the ids in `?ids=…` and reloads, and this route renders
// each queued invoice's sheet from the SAME `app/lib/invoice-sheet.js` builder the single view uses.
// "Print Invoices" is then the browser's own print dialog over those sheets, one A5 page each.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const idsParam = routeKit.pick(query.ids, "");
    const ids = idsParam ? idsParam.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

    // One sheet per id, in queue order. An id with no materialised document (never rebuilt, or deleted)
    // is skipped rather than failing the whole page — the legacy queue drops a missing record the same
    // way. The sheet builder is the same one `/invoices/<id>/view` calls, so the printed sheet cannot
    // differ from the on-screen document.
    const buildSheet = (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/invoice-sheet.js")).buildSheet;
    const sheets = [];
    for (const id of ids) {
      const s = await buildSheet(A, id);
      if (s) sheets.push({ id: String(id), data: s.data });
    }

    return routeKit.renderRoute(
      req,
      { user, active: "print", title: "Print queue", paper: "a5", template: "print/queue/page.html.jinja" },
      { ids: ids.join(","), sheets, count: sheets.length }
    );
  };
})();
