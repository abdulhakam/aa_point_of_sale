// /print — the print queue, from a route FOLDER (tb-0030 step 5).
//
// GET lists recent print jobs; POST enqueues a batch (every open invoice in a date range, or the one
// named). Printing is a browser dialog over a server-rendered page; there is no printer driver.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const recent = await db.all(
      'SELECT hex("id") hx, "name", "input", "state", "created" FROM "job" ' +
        'WHERE "name" = ? ORDER BY "created" DESC LIMIT 20',
      ["print.run"]
    );

    return routeKit.renderRoute(
      req,
      { user, active: "print", title: "Print queue", template: "print/index.html" },
      {
        recent: recent.map((r: any) => {
          // `input` is the job's JSON payload; the count is what the table wants, so it is parsed
          // here rather than in the template. The id is read as hex and shown in the base64 form
          // every other link in the app uses.
          let count = 0;
          try {
            count = (JSON.parse(String(r[2] ?? "{}")).invoices ?? []).length;
          } catch {
            count = 0;
          }
          return { id: routeKit.hexToB64(String(r[0] ?? "")), state: r[3], created: String(r[4] ?? "").slice(0, 19), count };
        }),
        query,
        today: A.format.dateOnly(new Date().toISOString()),
      }
    );
  };

  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    // A batch: every open invoice in the date range, or the one named. Ids are carried as hex,
    // because a BLOB column is matched with unhex(?) rather than against a base64 text parameter.
    const ids: string[] = [];
    if (form.invoice) {
      ids.push(routeKit.b64ToHex(String(form.invoice)));
    } else {
      const rows = await db.all(
        'SELECT hex("id") hx FROM invoices WHERE "status" = \'open\' AND "deleted" = 0 ' +
          'AND date("dated") >= date(?) AND date("dated") <= date(?) ORDER BY "dated" DESC LIMIT 200',
        [String(form.from || "1970-01-01"), String(form.to || "2999-12-31")]
      );
      for (const r of rows) ids.push(String(r[0]));
    }
    if (!ids.length) return { text: "No invoices in that range to print", status: 400 };
    // enqueue answers with the job's hex id, which the job links want in base64.
    const jobHex = await A.jobs.enqueue(db, "print.run", { invoices: ids, reason: String(form.reason || "batch") });
    return { redirect: "/print?status=queued&job=" + routeKit.hexToB64(String(jobHex)), status: 303 };
  };
})();
