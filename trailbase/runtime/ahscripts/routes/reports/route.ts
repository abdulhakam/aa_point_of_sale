// /reports — the reports hub, from a route FOLDER (tb-0030 step 5).
//
// Only the exact `/reports` is owned here. `/reports/<key>` (a report page), `/reports/status` and
// `/reports/refresh` still fall through to the dispatcher: the host resolves literal folders with
// precedence, so creating this folder does not shadow them.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const hub = await A.pages.hubIndex("/app/pages");
    // The `ledgers` tile is a link to the ledger hub rather than a report, so it is inserted at the
    // position its legacy index held, between "Payments By Company" and "Stock Report".
    const tiles = hub.reports.slice();
    const ledgersAt = tiles.findIndex((t: any) => t.target === "stockreport");
    if (ledgersAt >= 0) {
      tiles.splice(ledgersAt, 0, { title: "Ledgers", target: "ledgers", tone: "grape", icon: "chart-line" });
    }

    return routeKit.renderRoute(
      req,
      { user, active: "reports", title: "Reports", template: "reports/index.html" },
      { tiles, ledgerTiles: hub.ledgers }
    );
  };
})();
