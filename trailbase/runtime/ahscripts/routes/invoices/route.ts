// /invoices — the invoice list, from a route FOLDER (tb-0030 step 5).
//
// Only the exact GET `/invoices` is owned here. `/invoices/new` and `/invoices/<id>/…` still fall
// through to the dispatcher, because the host resolves their folders (or finds none) before this one.
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
    const rows = await A.invoices.listInvoices(db, filters);
    const totals = await A.invoices.sumInvoices(db, filters);

    return routeKit.renderRoute(
      req,
      { user, active: "invoices", title: "Invoices", template: "invoices/index.html" },
      {
        rows,
        filters,
        types: routeKit.typeOptions(A.invoices.INVOICE_TYPES),
        selectedType: Number(filters.type || -1),
        parties: refs.parties ?? [],
        totals,
      }
    );
  };
})();
