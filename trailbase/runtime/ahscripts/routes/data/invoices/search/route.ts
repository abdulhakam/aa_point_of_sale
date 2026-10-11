// GET /data/invoices/search — invoice-number search for the console's invoice-# picker.
//
// The console renders only this type's newest invoices (a 200-row server cap). Shipping the whole
// type inline is not affordable: type 1 (sale) is 12,000+ rows, and the console re-renders on every
// line write. Instead `public/js/invoice-remote.js` calls this endpoint, debounced, as the operator
// types digits, and the picker lists the matches.
//
// `type` is the invoice type; `q` is matched as a substring of the invoice number (digits only —
// invoice numbers are integers, so a `CAST(... AS TEXT) LIKE '%q%'` scan over the type's rows is
// cheap and lets the operator type a middle fragment). Newest match first, capped at 50.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const type = String(Number(routeKit.pick(query.type, "0")));
    const digits = String(routeKit.pick(query.q, "")).replace(/[^0-9]/g, "");
    const contentType = "application/json; charset=utf-8";
    const headers = { "cache-control": "private, no-store" };
    if (!digits) return { body: JSON.stringify({ invoices: [] }), contentType, headers };

    const rows = await db.all(
      'SELECT i."id" AS id, i."invoiceNo" AS invoiceNo, pa."name" AS partyName ' +
        'FROM invoices i LEFT JOIN parties pa ON pa."id" = i."party" ' +
        'WHERE i."deleted" = 0 AND i."type" = ? AND CAST(i."invoiceNo" AS TEXT) LIKE ? ' +
        'ORDER BY i."invoiceNo" DESC LIMIT 50',
      [type, "%" + digits + "%"]
    );
    const invoices = (rows ?? []).map((r: any) => ({ id: r[0], invoiceNo: Number(r[1]) || 0, partyName: r[2] || "" }));
    return { body: JSON.stringify({ invoices }), contentType, headers };
  };
})();
