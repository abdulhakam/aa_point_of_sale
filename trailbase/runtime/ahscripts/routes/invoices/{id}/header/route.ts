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
        discount_rs: String(form.discount_rs || ""),
      });
    });
    return { redirect: "/invoices/" + idB64 + "?status=ok", status: 303 };
  };
})();
