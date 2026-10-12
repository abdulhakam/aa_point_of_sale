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
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
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

    // 1. The matching invoices, from `invoices` alone — the cheap scan. `hex(i."id")` is the join key
    //    for the total below.
    const rows = await db.all(
      'SELECT i."id" AS id, i."invoiceNo" AS invoiceNo, pa."name" AS partyName, ' +
        'substr(i."dated", 1, 10) AS dated, hex(i."id") AS idHex ' +
        'FROM invoices i LEFT JOIN parties pa ON pa."id" = i."party" ' +
        'WHERE i."deleted" = 0 AND i."type" = ? AND CAST(i."invoiceNo" AS TEXT) LIKE ? ' +
        'ORDER BY i."invoiceNo" DESC LIMIT 50',
      [type, "%" + digits + "%"]
    );
    const found: any[] = rows ?? [];
    if (!found.length) return { body: JSON.stringify({ invoices: [] }), contentType, headers };

    // 2. The header total for ONLY those rows. The line-total aggregate runs over the ≤50 matched
    //    ids (via `idx_transactions_invoice`), NOT the whole `transactions` table — aggregating every
    //    invoice on each keystroke was measured at ~37-48 ms vs ~6-10 ms for the invoices-only scan.
    //    `unhex(?)` is the indexed BLOB column, so the subquery stays index-driven.
    const idHexes = found.map((r: any) => String(r[4]));
    const marks = idHexes.map(() => "unhex(?)").join(",");
    const totals = await db.all(
      'SELECT hex(t."invoice") AS hx, ' + A.invoices.HEADER_TOTAL_SQL + ' AS total ' +
        'FROM invoices i JOIN (SELECT "invoice", ' + A.invoices.LINE_TOTAL_SUM_SQL + ' AS total ' +
        '          FROM transactions WHERE "deleted" = 0 AND "invoice" IN (' + marks + ') GROUP BY "invoice") t ON t."invoice" = i."id"',
      idHexes
    );
    const totalByHex = new Map((totals ?? []).map((r: any) => [String(r[0]).toUpperCase(), Number(r[1] || 0)]));
    const invoices = found.map((r: any) => ({
      id: r[0],
      invoiceNo: Number(r[1]) || 0,
      partyName: r[2] || "",
      dated: String(r[3] || "").slice(0, 10),
      totalText: (totalByHex.get(String(r[4]).toUpperCase()) ?? 0).toFixed(2),
    }));
    return { body: JSON.stringify({ invoices }), contentType, headers };
  };
})();
