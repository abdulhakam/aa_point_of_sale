// POST /invoices/<id>/line/<lineId>/delete — remove one line, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/invoices\/([^\/]+)\/line\/([^\/]+)\/delete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(idB64));
    const userHex = routeKit.userHex(req);
    const lineHex = routeKit.b64ToHex(String(match[2]));
    const consoleWrite = String(form.surface || "") === "console";

    // The keyboard console routes its line removal through the CANONICAL lifecycle path (lease +
    // removeLine), the same money/write chain the grid uses; the older entry screen keeps `invoicing`.
    if (consoleWrite) {
      try {
        await A.lifecycle.requireLease(db, hex, userHex, String(form.device || ""));
        await routeKit.write(() => A.lifecycle.removeLine(db, hex, lineHex, "rm-" + match[2] + "-" + Date.now().toString(36)));
      } catch (e: any) {
        if (A.http.isFragment(req)) {
          const state = await A.lifecycle.readState(db, hex);
          const view = await A.invoices.consoleView(A, req, { type: state ? state.type : 1, invoiceId: idB64, message: "Cannot remove: " + (e.message || e), status: "error" });
          if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
        }
        return { text: "Cannot remove: " + (e.message || e), status: e?.status ?? 409 };
      }
    } else {
      if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
      await routeKit.write(async () => {
        await A.invoicing.deleteLine(db, lineHex);
      });
    }
    // htmx write: re-render the screen that made it.
    if (A.http.isFragment(req)) {
      if (consoleWrite) {
        const state = await A.lifecycle.readState(db, hex);
        const view = await A.invoices.consoleView(A, req, { type: state ? state.type : 1, invoiceId: idB64, message: "Line removed", status: "ok" });
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      const view = await A.invoices.entryView(A, idB64, "Saved");
      if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: "/invoices/" + idB64 + "?status=ok", status: 303 };
  };
})();
