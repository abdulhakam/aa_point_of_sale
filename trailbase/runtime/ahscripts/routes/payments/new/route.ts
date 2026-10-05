// /payments/new — the new-payment screen, from a route FOLDER (tb-0030 step 5).
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
    const invoice = query.invoice ? await A.invoices.readInvoice(db, String(query.invoice)) : null;
    const open = await A.invoices.listInvoices(db, { unpaid: "on" });

    return routeKit.renderRoute(
      req,
      { user, active: "payments", title: "New payment", template: "payments/new.html" },
      {
        invoice,
        openInvoices: open.slice(0, 100),
        types: routeKit.typeOptions(A.payments.PAYMENT_TYPES),
        selectedType: Number(routeKit.pick(query.type, invoice && invoice.type === 0 ? "0" : "1")),
        selectedParty: String(routeKit.pick(query.party, invoice ? invoice.party || "" : "")),
        selectedPaidTo: "",
        amount: String(routeKit.pick(query.amount, invoice ? invoice.balanceText : "")),
        today: A.format.dateOnly(new Date().toISOString()),
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        error: "",
      }
    );
  };
})();
