// GET /bench/spool — the spooled-vs-rows A/B, from a route FOLDER (tb-0030 step 5).
//
// `?arm=spooled` is the new path: sqlite.spool -> KV handle -> render.spooled. `?arm=rows` is the old
// shape, kept so the two are measurable on the same data. Both render the same template from the same
// SQL, so a timing difference is transport, not output.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const query = routeKit.parsePairs(String(req.query || ""));

    const t0 = Date.now();
    const arm = String(query.arm || "spooled");
    const reportName = String(query.report || "ledgers/booker");
    const spooled = await (globalThis as any).__AA_LOAD__("/ahscripts/lib/spoolreports.js");
    const filters = { booker: query.booker || "", party: query.party || "", from: query.from || "", to: query.to || "" };
    const timing: any = {};
    // `?format=html` returns the rendered document itself, so a bench run can assert the two arms are
    // BYTE-IDENTICAL. A timing comparison between arms that render different bytes is worthless.
    const asHtml = String(query.format || "") === "html";

    // Unknown report names must fail loudly, or the bench would measure one report under another's label.
    const known = await spooled.names();
    if (!known.includes(reportName)) {
      return { error: `unknown report: ${reportName}`, known };
    }

    if (arm === "rows") {
      // The old shape, on the same SQL and the same template: bring every row into QuickJS, zip the
      // columns in JS, then render. The baseline the other arm has to beat.
      const { sql, cols, binds } = await spooled.parts(reportName, filters);
      const tRows = Date.now();
      const raw = await db.all(sql, binds);
      const mapped = (raw ?? []).map((values: any[]) => {
        const obj: any = {};
        for (let i = 0; i < cols.length; i++) obj[cols[i]] = values[i];
        return obj;
      });
      const acquireMs = Date.now() - tRows;
      const htmlOut: string = (globalThis as any).render.html("bench/spool/page.html.jinja", { rows: mapped });
      if (asHtml) return { html: htmlOut, status: 200 };
      return { report: reportName, arm, rows: mapped.length, acquireMs, totalMs: Date.now() - t0, htmlBytes: htmlOut.length };
    }

    const htmlOut: string = await spooled.renderPage(
      reportName,
      "bench/spool/page.html.jinja",
      {},
      filters,
      -1,
      (h: any) => {
        timing.handle = h;
      }
    );
    if (asHtml) return { html: htmlOut, status: 200 };
    return {
      report: reportName,
      arm,
      rows: timing.handle ? timing.handle.rows : 0,
      bytes: timing.handle ? timing.handle.bytes : 0,
      queryMs: timing.handle ? timing.handle.queryMs : 0,
      writeMs: timing.handle ? timing.handle.writeMs : 0,
      totalMs: Date.now() - t0,
      htmlBytes: htmlOut.length,
    };
  };
})();
