// GET /bench/report — per-report acquisition A/B, from a route FOLDER (tb-0030 step 5).
//
// Scope: this measures acquiring the BASE-TABLE ROWS each report needs — the step a component split
// would move. The report arithmetic is SQL in both arms, so this is an acquisition benchmark per report.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const query = routeKit.parsePairs(String(req.query || ""));

    const key = String(query.key || "");
    const arm = String(query.arm || "inline");

    let tables: string[] = [];
    try {
      // Which base tables this report touches, read from its own composed statement. Deriving it keeps
      // the benchmark honest: it measures the tables the query really reads.
      if (!(await A.spooled.names()).includes(key)) return { error: "unknown report: " + key };
      tables = await A.spooled.tablesForReport(key);
    } catch (e: any) {
      return { error: `bench/report ${key}: ${(e && e.message) || String(e)}` };
    }

    const t0 = Date.now();
    let rows = 0;
    let bytes = 0;
    let acquireMs = 0;
    let handoffMs = 0;
    const perTable: any[] = [];

    for (const table of tables) {
      const tA = Date.now();
      if (arm === "component") {
        const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
        const res: any = await (globalThis as any).http.request({
          method: "GET",
          url: origin + "/rpc/table?name=" + encodeURIComponent(table),
        });
        if (!res || Number(res.status) !== 200) return { error: "sql component failed on " + table + ": " + (res && res.status) };
        const handle = JSON.parse(String(res.body));
        acquireMs += Date.now() - tA;
        const tH = Date.now();
        const got = await routeKit.kvTakeJSONL(String(handle.key));
        handoffMs += Date.now() - tH;
        rows += got.length;
        bytes += Number(handle.bytes || 0);
        perTable.push({ table, rows: got.length, bytes: handle.bytes, queryMs: handle.queryMs, writeMs: handle.writeMs });
      } else if (arm === "raw") {
        // Fair-comparison arm: the SAME work as the component (read columns, select all rows, no
        // per-row normalisation), so the only difference from `component` is the packaging.
        //
        // `PRAGMA table_info` is rejected by the DB bridge, but the table-valued `pragma_table_info(?)`
        // form is a SELECT and works.
        const info = await db.all("SELECT name FROM pragma_table_info(?)", [table]);
        const cols = (info ?? []).map((r: any[]) => r[0]);
        const select = cols.map((c: string) => '"' + c + '"').join(", ");
        const got = await db.all('SELECT ' + select + ' FROM "' + table + '" ORDER BY "id" DESC', []);
        acquireMs += Date.now() - tA;
        rows += (got ?? []).length;
        perTable.push({ table, rows: (got ?? []).length });
      } else {
        const got = await A.data.readTable(table);
        acquireMs += Date.now() - tA;
        rows += got.length;
        perTable.push({ table, rows: got.length });
      }
    }

    return { key, arm, tables, rows, bytes, acquireMs, handoffMs, totalMs: Date.now() - t0, perTable };
  };
})();
