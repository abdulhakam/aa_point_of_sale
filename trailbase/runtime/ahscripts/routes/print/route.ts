// /print — the legacy print PICKER, from a route FOLDER.
//
// This replaces the previous server-side "batch by date range" form. The legacy app
// (`/app/invoices/printinvoice`) is a single-invoice picker: an Invoice Type select and an Invoice No
// select, a "View Invoice" button, a live preview of the chosen invoice, and a Print Queue rail. The
// actual queue is the browser's `localStorage` under the key `print-queue` (managed by
// `app/public/js/print-queue.js`); the separate `/print/queue` page renders and prints it.
//
// The queue is populated by "Add to Print Queue" on the invoice sheet (`/invoices/<id>/view`), exactly
// as legacy populates it from `/app/invoices/print`. Nothing is POSTed: the queue never leaves the
// browser, so this route owns GET only.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    // Legacy's picker listed only purchase and sale; the guest now builds return and difference too, so
    // the picker lists every invoice type the app can produce. Default matches legacy (`purchase`).
    const types = Object.keys(A.invoices.INVOICE_TYPES).map((code) => ({ code, label: A.invoices.INVOICE_TYPES[code] }));
    const type = routeKit.pick(query.type, "0");
    const typeCode = String(Number(type) in A.invoices.INVOICE_TYPES ? Number(type) : 0);

    // Every non-deleted invoice of the chosen type, newest number first. Ids are the URL-safe base64 the
    // bridge hands out (and the form the `<option value>` and every `/invoices/<id>/…` link use).
    const rows = await db.all(
      'SELECT "id" AS id, "invoiceNo" AS invoiceNo FROM invoices ' +
        'WHERE "deleted" = 0 AND "type" = ? ORDER BY "invoiceNo" DESC',
      [typeCode]
    );
    const invoices = (rows ?? []).map((r: any) => ({ id: r[0], invoiceNo: Number(r[1]) || 0 }));

    // A chosen invoice drives the legacy preview iframe; it is only honoured when it is in the list, so
    // a stale or hand-crafted id cannot point the iframe at an arbitrary path.
    const chosen = routeKit.pick(query.invoice, "");
    const selected = chosen && invoices.some((i: any) => String(i.id) === String(chosen)) ? String(chosen) : "";

    return routeKit.renderRoute(
      req,
      { user, active: "print", title: "Print Invoices", template: "print/page.html.jinja" },
      {
        types,
        // A STRING, so the template's `selectedType == t.code` compares like with like — minijinja does
        // not coerce `"0"` to `0`, and a mismatch would silently fall back to the first option.
        selectedType: String(typeCode),
        invoices,
        selected,
      }
    );
  };
})();
