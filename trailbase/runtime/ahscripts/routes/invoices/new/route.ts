// /invoices/new — the keyboard invoice console, from a route FOLDER (tb-0030 step 5).
//
// GET renders the console (picker, or a loaded invoice via `?invoice=<id>`); POST creates the invoice.
// Both need the auth gate. The `type` comes from the query (`?type=0` is a purchase).
//
// This route used to render `invoices/entry.html` and 303 on every create. It is now the keyboard
// console (`invoices/console.html`, [[no-draft-invoices-published-on-save]] aside): the POST answers an
// htmx request with the OPENED console fragment — the same screen the GET renders — so the create no
// longer costs a full document load. `grid.html` at `/invoices/<id>/grid` stays the no-JS fallback.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    // 0 purchase, 1 sale, 2 return, 3 difference — the four `invoice_types`. Anything else is a sale.
    const rawType = Number(routeKit.pick(query.type, "1"));
    const type = rawType in A.invoices.INVOICE_TYPES ? rawType : 1;

    // `?invoice=<id>` opens that invoice in the console (State E -> Edit). No id is State 0 (picker).
    const invoiceId = String(query.invoice || "");
    const view = await A.invoices.consoleView(A, req, {
      type,
      invoiceId: invoiceId || undefined,
      actions: String(query.actions || "") === "1",
    });
    if (!view) return { text: "No such invoice", status: 404 };
    return routeKit.renderRoute(req, { user, ...view.options }, view.data);
  };

  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const form = routeKit.parsePairs(String(req.body || ""));
    // The form carries its type in a hidden field; the tile links pass it in the query. Both accepted.
    const rawType = Number(routeKit.pick(form.type, routeKit.pick(query.type, "1")));
    const type = rawType in A.invoices.INVOICE_TYPES ? rawType : 1;
    const userHex = routeKit.userHex(req);

    let created: any;
    try {
      // A key from the form makes a repeated submit return the same invoice instead of a second one.
      created = await routeKit.write(async () => {
        // The party first: if it cannot be made, no invoice is created.
        const newParty = await A.quickCreate.partyFromForm(db, form);
        const invoice = await A.invoicing.createInvoice(db, {
          type,
          key: String(form.key || ""),
          userHex,
          device: String(form.device || ""),
        });
        const createdHex = routeKit.b64ToHex(String(invoice.id));
        await A.invoicing.patchHeader(db, createdHex, {
          party: newParty ? routeKit.hexToB64(newParty) : String(form.party || ""),
          booker: String(form.booker || ""),
          dated: String(form.dated || "") || A.format.dateOnly(new Date().toISOString()),
        });
        return invoice;
      });
    } catch (e: any) {
      const why = e && e.message ? e.message : String(e);
      if (A.http.isFragment(req)) {
        const view = await A.invoices.consoleView(A, req, { type, message: "Cannot create: " + why, status: "error" });
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { text: "Cannot create: " + why, status: (e && e.status) || 409 };
    }

    // htmx: re-render the console with the invoice OPENED, so the operator drops straight into line
    // entry with no document reload. A plain POST still 303-redirects: a console capture returns to
    // the console, and every other caller keeps the long-standing `/invoices/<id>` landing (which the
    // smoke suite and other consumers rely on).
    if (A.http.isFragment(req)) {
      const view = await A.invoices.consoleView(A, req, { type, invoiceId: created.id, message: "Created", status: "ok" });
      if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    const target =
      String(form.surface || "") === "console"
        ? "/invoices/new?type=" + type + "&invoice=" + created.id
        : "/invoices/" + created.id;
    return { redirect: target, status: 303 };
  };
})();
