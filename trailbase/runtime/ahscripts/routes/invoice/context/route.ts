// GET /invoice/context — the entry screen's reference snapshot, from a route FOLDER (tb-0030 step 5).
//
// A literal folder, so it wins over the sibling `{id}` folder. ETag-keyed on the data fingerprint.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const type = String(query.type || "sale");
    const items = (await A.baseviews.itemsReport()).map((r: any) => ({
      id: r.id, name: r.name, category: r.category, box_size_qty: r.box_size_qty,
      cost_price: r.cost_price, sale_price: r.sale_price, stock: r.qty,
    }));
    const counts = await db.all('SELECT "type", COUNT(*) FROM "invoices" GROUP BY "type" ORDER BY "type"', []);
    const countOf = (code: number) => {
      const hit = (counts ?? []).find((r: any[]) => Number(r[0]) === code);
      return (hit ? Number(hit[1]) : 0) + 1;
    };
    const refs = await routeKit.refs();
    // The ETag used to carry the snapshot's in-memory version COUNTER, which ticked when the refresh
    // job ran rather than when the data changed — so an invoice edited from another tab could leave the
    // ETag valid. The data fingerprint is what actually determines this payload.
    const version = await A.service.dataVersion();
    const etag = `W/"inv-ctx-${version}-${JSON.stringify(counts)}-${type}"`;
    const headers = { etag, "cache-control": "private, no-cache" };
    if (String((req.headers && req.headers["if-none-match"]) || "") === etag) {
      return { status: 304, body: "", contentType: "application/json; charset=utf-8", headers };
    }
    const payload = {
      version,
      type,
      items,
      parties: refs.parties ?? [],
      bookers: refs.bookers ?? [],
      areas: refs.areas ?? [],
      sections: refs.sections ?? [],
      categories: refs.categories ?? [],
      companies: refs.companies ?? [],
      next: { purchase: countOf(0), sale: countOf(1), return: countOf(2), difference: countOf(3) },
    };
    return { body: JSON.stringify(payload), contentType: "application/json; charset=utf-8", headers };
  };
})();
