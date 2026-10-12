// POST /invoice — create an invoice over the JSON API, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const body = routeKit.jsonBody(req);
    // Validate `type` before calling in. `createInvoice` does `String(Number(type))`, so a missing or
    // non-numeric type reached the INSERT as the literal string "NaN" and tripped the invoices CHECK
    // constraint — surfacing as an opaque `500`. It is a bad request. Found by `tools/route-coverage.mjs`.
    //
    // 0 purchase, 1 sale, 2 return, 3 difference ([[data-model]]). All four are reachable from the
    // UI — `/invoices` is the legacy five-tile hub and `/invoices/new?type=N` opens each entry screen
    // ([[ui-parity-discrepancies-2026-10-08]]) — so the JSON create accepts all four. This comment
    // previously said return and difference had no screen; that was true when written and is not now.
    const type = Number(body.type);
    if (!Number.isInteger(type) || type < 0 || type > 3) {
      return { error: "invalid invoice type", type: body.type ?? null, allowed: [0, 1, 2, 3] };
    }
    const userHex = routeKit.userHex(req);
    const created = await routeKit.write(() =>
      A.invoicing.createInvoice(db, { type, key: body.key, userHex, device: body.device })
    );
    return created;
  };
})();
