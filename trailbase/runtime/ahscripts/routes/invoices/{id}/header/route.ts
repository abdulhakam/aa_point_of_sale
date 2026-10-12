// POST /invoices/<id>/header — save the invoice header, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/invoices\/([^\/]+)\/header$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(idB64));
    const userHex = routeKit.userHex(req);

    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
    await routeKit.write(async () => {
      // A party typed into the panel is created here, and the header is then saved with it — the same
      // submit, so the date and booker that were being edited are not lost to a detour.
      const newParty = await A.quickCreate.partyFromForm(db, form);
      await A.invoicing.patchHeader(db, hex, {
        party: newParty ? routeKit.hexToB64(newParty) : String(form.party || ""),
        booker: String(form.booker || ""),
        dated: String(form.dated || ""),
        description: String(form.description || ""),
        discount_1: String(form.discount_1 || ""),
        discount_2: String(form.discount_2 || ""),
        discount_rs: String(form.discount_rs || ""),
      });
    });
    // htmx write: re-render the screen that made it. A console write (`surface=console`) answers with
    // the console; the older entry screen answers with entry.html.jinja. One form field, so a write's screen
    // cannot drift from the GET that rendered it.
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
