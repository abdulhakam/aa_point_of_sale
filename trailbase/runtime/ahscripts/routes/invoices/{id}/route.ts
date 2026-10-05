// GET /invoices/<id> — the invoice entry screen (the older form-and-list view), from a route FOLDER
// (tb-0030 step 5). The grid at `/invoices/<id>/grid` is the newer entry screen; this is kept until the
// grid has been exercised end to end.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/invoices\/([^\/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const refs = await routeKit.refs();
    const invoice = await A.invoices.readInvoice(db, routeKit.decode(match[1]));
    if (!invoice) return { text: "No such invoice", status: 404 };

    return routeKit.renderRoute(
      req,
      { user, active: "invoices", title: "Invoice #" + invoice.invoiceNo, template: "invoices/entry.html" },
      {
        invoice,
        type: invoice.type,
        // A sale is paid in, a purchase is paid out.
        paymentTypeHint: invoice.type === 0 ? 0 : 1,
        // Fresh per render, so a repeated submit of the same page is one line and a line added
        // from the reloaded page is a new one.
        opKey: "line-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36),
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        items: routeKit.editorItems(refs),
        // The quick-create panels' option lists; see `/invoices/new`.
        areas: refs.areas ?? [],
        companies: refs.companies ?? [],
        message: query.status === "ok" ? "Saved" : "",
      }
    );
  };
})();
