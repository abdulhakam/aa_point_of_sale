// GET /data/invoices — the client INVOICE lookup payload, from a route FOLDER.
//
// The invoice slice the IndexedDB reference cache deferred
// ([[reference-lists-come-from-indexeddb]], "It gets its own slice"). It is separate from
// `GET /data/refs` on purpose: `invoices` is ~8,900 rows, and folding it into the reference payload
// would make every page sync it. This is fetched lazily by `public/js/invoicedb.js`, only when a
// page actually has an invoice picker, and cached in IndexedDB against the same data version.
//
// Columns are the ones a picker option needs — id, number, type, party name, paid and balance — read
// through `invoices.pickerInvoices`, so a select populated from here matches a server-rendered one by
// construction. ETag-keyed on the data version (the same fingerprint the rendered-page cache uses), so
// an unchanged depot answers 304 and the client keeps its cache.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const version = await A.service.dataVersion();
    const etag = `W/"invoices-${version}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    const contentType = "application/json; charset=utf-8";
    if (String((req.headers && req.headers["if-none-match"]) || "") === etag) {
      return { status: 304, body: "", contentType, headers };
    }

    const invoices = await A.invoices.pickerInvoices(db);
    return { body: JSON.stringify({ version, invoices }), contentType, headers };
  };
})();
