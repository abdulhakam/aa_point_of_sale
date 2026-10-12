// POST /invoices/<id>/complete — complete or reopen the invoice, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/invoices\/([^\/]+)\/complete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(idB64));
    const userHex = routeKit.userHex(req);

    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
    await routeKit.write(async () => {
      await A.invoicing.completeInvoice(db, hex, userHex, form.complete === "1");
    });
    // htmx write: re-render the screen that made it.
    if (A.http.isFragment(req)) {
      if (String(form.surface || "") === "console") {
        const state = await A.lifecycle.readState(db, hex);
        const view = await A.invoices.consoleView(A, req, { type: state ? state.type : 1, invoiceId: idB64, message: "Saved", status: "ok" });
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      const view = await A.invoices.entryView(A, idB64, "Saved");
      if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: "/invoices/" + idB64 + "?status=ok", status: 303 };
  };
})();
