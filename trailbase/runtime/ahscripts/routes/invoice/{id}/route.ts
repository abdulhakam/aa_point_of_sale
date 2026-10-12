// /invoice/<id> — read (GET) or patch (PATCH) one invoice, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoice\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const hex = routeKit.b64ToHex(match[1]);
    const head = routeKit.rowsToObjects(
      ["id", "type", "invoiceNo", "party", "booker", "dated", "discount_1", "discount_2", "discount_rs", "description", "completed"],
      await db.all('SELECT "id","type","invoiceNo","party","booker","dated","discount_1","discount_2","discount_rs","description","completed" FROM "invoices" WHERE "id" = unhex(?)', [hex])
    );
    if (!head.length) return { text: "No such invoice", status: 404 };
    return {
      invoice: head[0],
      lines: routeKit.rowsToObjects(
        ["id", "item", "qty", "price", "cost_price", "discount_1", "discount_2", "discount_rs", "scheme"],
        await db.all('SELECT "id","item","qty","price","cost_price","discount_1","discount_2","discount_rs","scheme" FROM "transactions" WHERE "invoice" = unhex(?) ORDER BY "id" DESC', [hex])
      ),
    };
  };

  (globalThis as any).PATCH = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/invoice\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const body = routeKit.jsonBody(req);
    const hex = routeKit.b64ToHex(match[1]);
    const userHex = routeKit.userHex(req);
    if (!(await A.invoicing.takeLock(db, hex, userHex, String(body.device || "")))) return routeKit.locked();
    const updated = await routeKit.write(() => A.invoicing.patchHeader(db, hex, body));
    return { updated };
  };
})();
