// /payments — the payment list, from a route FOLDER (tb-0030 step 5).
//
// Only the exact GET `/payments` is owned here. `/payments/new`, the POST and `/payments/<id>/delete`
// still fall through to the dispatcher.
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
      standalone: routeKit.flag(query.standalone),
      open: routeKit.flag(query.open),
    };
    const rows = await A.payments.listPayments(db, filters);
    const totals = await A.payments.sumPayments(db, filters);

    return routeKit.renderRoute(
      req,
      { user, active: "payments", title: "Payments", template: "payments/index.html" },
      {
        rows,
        filters,
        types: routeKit.typeOptions(A.payments.PAYMENT_TYPES),
        selectedType: Number(filters.type || -1),
        parties: refs.parties ?? [],
        totals,
      }
    );
  };
})();
