// GET /bench/payload — component-split A/B, from a route FOLDER (tb-0030 step 5).
//
// `?arm=inline` acquires the rows in this component and renders straight from the SQL result;
// `?arm=component` asks the separate `sql.wasm` component for the same rows and gets back only a
// *handle* (a spool file path), then renders from that file. Both arms produce byte-identical HTML from
// identical data — asserted by `tools/split-bench.mjs`.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const query = routeKit.parsePairs(String(req.query || ""));

    const arm = String(query.arm || "inline");
    const limit = Math.max(1, Math.min(50000, Number(query.limit || 2000) || 2000));
    const cols = ["amount", "paid", "payment_date", "description", "qty", "price", "discount_rs"];
    const t0 = Date.now();

    let rows: any[] = [];
    let acquireMs = 0;
    let handoffMs = 0;
    let handle: any = null;

    if (arm === "component") {
      const tAcq = Date.now();
      const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
      const res: any = await (globalThis as any).http.request({
        method: "GET",
        url: origin + "/rpc/payload?limit=" + encodeURIComponent(String(limit)),
      });
      acquireMs = Date.now() - tAcq;
      if (!res || Number(res.status) !== 200) return { text: "sql component failed: " + (res && res.status), status: 502 };
      handle = JSON.parse(String(res.body));

      // The handoff: a name, not a value. Read the bytes the component left in the shared KV store.
      const tHand = Date.now();
      rows = await routeKit.kvTakeJSONL(String(handle.key));
      handoffMs = Date.now() - tHand;
    } else {
      const tAcq = Date.now();
      // NOTE: there is no way to make this read cold from inside the guest. `PRAGMA cache_size` and
      // `PRAGMA shrink_memory` are rejected by the DB bridge, so cold is achieved by restarting the
      // server between measurements (tools/run-bench.ps1 -ColdRestart).
      const raw = await db.all(
        'SELECT p."amount", p."paid", p."payment_date", p."description", t."qty", t."price", t."discount_rs" ' +
          'FROM payments p LEFT JOIN transactions t ON t."id" = p."invoice" ' +
          'ORDER BY p."id" DESC LIMIT ?',
        [String(limit)]
      );
      rows = (raw ?? []).map((values: any[]) => {
        const obj: any = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = values[i];
        return obj;
      });
      acquireMs = Date.now() - tAcq;
    }

    const tRender = Date.now();
    const out: string = (globalThis as any).render.html("bench/payload/page.html.jinja", { rows });
    const renderMs = Date.now() - tRender;

    if (String(query.format || "") === "json") {
      return {
        arm,
        limit,
        rows: rows.length,
        acquireMs,
        handoffMs,
        renderMs,
        totalMs: Date.now() - t0,
        bytes: out.length,
        sqlComponent: handle,
      };
    }
    return { html: out, status: 200 };
  };
})();
