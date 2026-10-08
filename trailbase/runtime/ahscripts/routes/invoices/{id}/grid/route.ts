// GET /invoices/<id>/grid — the grid entry screen, from a route FOLDER (tb-0030 step 5).
//
// Reading is unconditional; writing needs the lease. The grid shows who holds it rather than presenting
// a dead form ([[single-writer-per-invoice]]).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoices\/([^\/]+)\/grid$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(routeKit.decode(idB64)));
    if (!hex) return { text: "No such invoice", status: 404 };
    const state = await A.lifecycle.readState(db, hex);
    if (!state) return { text: "No such invoice", status: 404 };
    const userHex = routeKit.userHex(req);
    const canWrite = state.lease === null || (state.lease.user ?? "").toUpperCase() === userHex;
    const refs = await routeKit.refs();
    const invoice = await A.invoices.readInvoice(db, routeKit.decode(idB64));
    if (!invoice) return { text: "No such invoice", status: 404 };

    return routeKit.renderRoute(
      req,
      { user, active: "invoices", title: "Invoice #" + invoice.invoiceNo, template: "invoices/grid.html" },
      {
        invoice: {
          ...invoice,
          canWrite,
          // Every saved invoice is editable, so the committed lines are inputs whenever the writer
          // holds the lease (vault/decisions/no-draft-invoices-published-on-save.md).
          lineInputs: canWrite,
          editable: canWrite,
          // Somebody else holding the lease is named, so a read-only grid says why.
          heldBy:
            state.lease && String(state.lease.user ?? "").toUpperCase() !== userHex
              ? state.lease.device || "another device"
              : "",
          paymentTypeHint: invoice.type === 0 ? 0 : 1,
        },
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        items: routeKit.editorItems(refs),
        // The item quick-create panel's company list: the grid now carries the same create-from-the-
        // invoice affordance the single-line form does ([[quick-create-rides-in-the-form-that-needed-it]]).
        companies: refs.companies ?? [],
      }
    );
  };
})();
