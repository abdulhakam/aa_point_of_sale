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

    // One builder, shared with the payment writes (create/delete) so an htmx write renders the same
    // list this GET does.
    const view = await A.payments.listView(A, req, query);
    return routeKit.renderRoute(req, { user, ...view.options }, view.data);
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
      // htmx create: re-render the list (flash included) into `#app-main`; a plain POST still 303s.
      if (A.http.isFragment(req)) {
        const view = await A.payments.listView(A, req, { status: "ok", message: "Payment saved" });
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { redirect: "/payments?status=ok", status: 303 };
    } catch (e: any) {
      const why = e && e.message ? e.message : String(e);
      // htmx error: re-render the NEW form with the operator's values and the error, rather than a bare
      // 400 body htmx would not swap.
      if (A.http.isFragment(req)) {
        const view = await A.payments.newView(
          A,
          req,
          { invoice: form.invoice, type: form.type, party: form.party, amount: form.amount },
          "Payment not saved: " + why
        );
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { text: "Payment not saved: " + why, status: 400 };
    }
  };
})();
