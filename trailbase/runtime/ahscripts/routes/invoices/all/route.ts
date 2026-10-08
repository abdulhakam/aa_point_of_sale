// /invoices/all — the full invoice list, from a route FOLDER.
//
// The list moved here when `/invoices` became the legacy five-tile hub. It keeps every filter, the
// totals and the pager it had; only its path and its back-link to the hub are new.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const refs = await routeKit.refs();
    const filters = {
      type: routeKit.pick(query.type, ""),
      from: routeKit.pick(query.from, ""),
      to: routeKit.pick(query.to, ""),
      party: routeKit.pick(query.party, ""),
      unpaid: routeKit.flag(query.unpaid),
    };
    const totals = await A.invoices.sumInvoices(db, filters);
    const pageSize = 100;
    const pageCount = Math.max(1, Math.ceil(totals.count / pageSize));
    const page = Math.min(Math.max(Math.floor(Number(routeKit.pick(query.page, "1"))) || 1, 1), pageCount);
    const rows = await A.invoices.listInvoices(db, filters, { limit: pageSize, offset: (page - 1) * pageSize });

    const baseQuery = ["type", "from", "to", "party"]
      .map((k) => k + "=" + encodeURIComponent(String(filters[k] || "")))
      .join("&") + (filters.unpaid ? "&unpaid=on" : "");

    return routeKit.renderRoute(
      req,
      { user, active: "invoices", title: "All invoices", template: "invoices/all.html" },
      {
        rows,
        filters,
        types: routeKit.typeOptions(A.invoices.INVOICE_TYPES),
        selectedType: Number(filters.type || -1),
        parties: refs.parties ?? [],
        totals,
        page,
        pageCount,
        pageSize,
        baseQuery,
      }
    );
  };
})();
