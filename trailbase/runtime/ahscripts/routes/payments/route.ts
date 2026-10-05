// /payments — the payment list (GET), from a route FOLDER (tb-0030 step 5).
//
// The exact GET `/payments` and the POST that records a payment. `/payments/new` is a literal sibling
// folder, and `/payments/<id>/delete` its own.
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

  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    try {
      await routeKit.write(() => A.payments.createPayment(db, {
        type: String(form.type || "1"),
        amount: String(form.amount || "0"),
        date: String(form.date || ""),
        party: String(form.party || ""),
        paidTo: String(form.paidTo || ""),
        invoice: String(form.invoice || ""),
        description: String(form.description || ""),
        paid: "on",
      }));
      return { redirect: "/payments?status=ok", status: 303 };
    } catch (e: any) {
      return { text: "Payment not saved: " + (e && e.message ? e.message : String(e)), status: 400 };
    }
  };
})();
