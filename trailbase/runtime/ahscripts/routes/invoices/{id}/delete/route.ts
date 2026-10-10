// POST /invoices/<id>/delete — SOFT-delete an invoice, from a route FOLDER (tb-0030 step 5).
//
// Deletion is soft ([[no-draft-invoices-published-on-save]]): the row keeps its id and its lines, the
// `invoices.deleted` marker is set, and the list/picker filter (`i.deleted = 0`) hides it. Nothing here
// removes a row. The console's confirm dialog posts this form; the write re-renders the console's
// picker screen on an htmx request, and 303s back to the type's console otherwise.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/invoices\/([^\/]+)\/delete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(routeKit.decode(idB64)));
    if (!hex) return { text: "Not an invoice id", status: 400 };
    const userHex = routeKit.userHex(req);

    const state = await A.lifecycle.readState(db, hex);
    if (!state) return { text: "No such invoice", status: 404 };
    const type = state.type;

    try {
      await routeKit.write(() =>
        A.lifecycle.softDeleteInvoice(db, hex, { userHex, device: String(form.device || "") })
      );
    } catch (e: any) {
      const why = e && e.message ? e.message : String(e);
      if (A.http.isFragment(req)) {
        const view = await A.invoices.consoleView(A, req, { type, message: "Cannot delete: " + why, status: "error" });
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { text: "Cannot delete: " + why, status: (e && e.status) || 409 };
    }

    // htmx: re-render the console's picker so the deleted invoice is gone and the next one can be
    // picked. A plain POST 303-redirects to the same console.
    if (A.http.isFragment(req)) {
      const view = await A.invoices.consoleView(A, req, { type, message: "Deleted", status: "ok" });
      if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: "/invoices/new?type=" + type + "&status=deleted", status: 303 };
  };
})();
