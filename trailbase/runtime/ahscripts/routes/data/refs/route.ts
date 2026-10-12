// GET /data/refs — the client reference-list payload, from a route FOLDER (tb-0030 step 5).
//
// WHY THIS EXISTS. The dropdowns used to be served only as server-rendered <option>s, so the client
// had no copy of the reference tables and a newly created row could not appear without a reload.
// `app/public/js/refdb.js` keeps these tables in IndexedDB and populates every `select[data-ref]` from
// it; this endpoint is the one place that hands it the data. See
// [[reference-lists-come-from-indexeddb]].
//
// WHAT IT IS. The nine lists defined by `app/sql/refs.sql`, read through the SAME `routeKit.refs()`
// loader every screen uses, so base64 ids, relation mapping and ordering are identical to the
// rendered pages by construction — a select populated from here and one populated from the template
// cannot disagree. Projected to just the columns a control needs, because `readTable` returns every
// column and `parties` has 943 rows of them.
//
// The `version` is the report service's data fingerprint, the same signal the rendered-page cache
// keys on. A management write moves it, so the client knows when its cache is stale. ETag-keyed on
// it, and `If-None-Match` answers 304, so a page load that changes nothing costs headers only.
//
// `invoices` is deliberately NOT here. Its only dropdown is `/payments/new`'s open-invoice picker,
// which is a computed unpaid/balance list over `payments` too, not the base table — caching the
// table would not serve that control. It is its own slice; recorded in the decision note.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const version = await A.service.dataVersion();
    const etag = `W/"refdb-${version}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    const contentType = "application/json; charset=utf-8";
    if (String((req.headers && req.headers["if-none-match"]) || "") === etag) {
      return { status: 304, body: "", contentType, headers };
    }

    // The projection — only the columns a control reads. `items` carries the three numbers the
    // invoice grid fills a line from on change (`data-price`/`data-cost`/`data-box`), so they must
    // survive the projection. The KEY LIST is not written here: it is whatever `refs.sql` returns, so
    // a list added or renamed there is served without a second edit. A key with no projection passes
    // through with all its columns rather than being silently dropped.
    const COLUMNS: { [key: string]: string[] } = {
      sections: ["id", "name"],
      companies: ["id", "name"],
      areas: ["id", "name"],
      parties: ["id", "name", "type"],
      bookers: ["id", "name"],
      items: ["id", "name", "category", "cost_price", "sale_price", "box_size_qty"],
      partyTypes: ["id", "name"],
      invoiceTypes: ["id", "name"],
      paymentTypes: ["id", "name"],
    };

    const refs = await routeKit.refs();
    const tables: { [key: string]: any[] } = {};
    for (const key of Object.keys(refs)) {
      const cols = COLUMNS[key];
      tables[key] = (refs[key] ?? []).map((row: any) => {
        if (!cols) return row;
        const out: any = {};
        for (const col of cols) out[col] = row[col];
        return out;
      });
    }

    // Parties carry the SAME composite label the server renders (`name - area - section`, see
    // `A.invoices.partyLabel`), so a refdb rebuild after a version change does not collapse a party
    // option to its bare name (tb-0040). The spec below points `label` at this computed column.
    const areas = new Map((refs.areas ?? []).map((r: any) => [String(r.id), r]));
    const sections = new Map((refs.sections ?? []).map((r: any) => [String(r.id), r]));
    tables.parties = (refs.parties ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? "",
      type: p.type,
      label: A.invoices.partyLabel(p, areas, sections),
    }));

    // The alias map and the per-table option spec travel WITH the data, so `refdb.js` holds no second
    // copy of "which `data-ref` value means which list" or "which column fills `data-price`". One
    // source (here) instead of a client constant that drifts from the projection it consumes.
    const ALIAS: { [key: string]: string } = {
      order_bookers: "bookers",
      party_types: "partyTypes",
      invoice_types: "invoiceTypes",
      payment_types: "paymentTypes",
    };
    const spec: { [key: string]: any } = {};
    for (const key of Object.keys(tables)) {
      spec[key] = key === "items"
        ? { label: "name", data: { price: "sale_price", cost: "cost_price", box: "box_size_qty" } }
        : key === "parties"
          ? { label: "label" }
          : { label: "name" };
    }

    return { body: JSON.stringify({ version, tables, alias: ALIAS, spec }), contentType, headers };
  };
})();
