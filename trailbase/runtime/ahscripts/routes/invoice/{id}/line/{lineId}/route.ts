// DELETE /invoice/<id>/line/<lineId> — delete a line over the JSON API, from a route FOLDER
// (tb-0030 step 5).
//
// PATCH /invoice/<id>/line/<lineId> — edit a line in place over the JSON API. This is the single-line
// edit the keyboard console's `up` flow needs; before it there was a JSON add and a JSON delete but no
// edit. It routes through the CANONICAL money path (`app/lib/invoice-lifecycle.js` `editLine`), which
// is the same chain the grid's save uses, so the keyboard flow and the grid cannot write different
// numbers ([[client-side-live-recalculation]]).
(function () {
  (globalThis as any).PATCH = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoice\/([^/]+)\/line\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const body = routeKit.jsonBody(req);
    const invoiceHex = routeKit.b64ToHex(match[1]);
    const lineHex = routeKit.b64ToHex(match[2]);
    const userHex = routeKit.userHex(req);
    try {
      await A.lifecycle.requireLease(db, invoiceHex, userHex, String(body.device || ""));
      await routeKit.write(() => A.lifecycle.editLine(db, invoiceHex, lineHex, body));
      return { updated: 1 };
    } catch (e: any) {
      return { text: e && e.message ? e.message : "cannot edit line", status: (e && e.status) || 400 };
    }
  };

  (globalThis as any).DELETE = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoice\/([^/]+)\/line\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const hex = routeKit.b64ToHex(match[1]);
    const userHex = routeKit.userHex(req);
    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
    const deleted = await routeKit.write(() => A.invoicing.deleteLine(db, routeKit.b64ToHex(match[2])));
    return { deleted };
  };
})();
