// /cashmemo/vouchers/<id> — one voucher on paper, from a route FOLDER (tb-0030 step 5).
//
// A voucher is a payment, so this reads `payments` rather than a materialised document: there is no
// invoice behind it by definition. `?print=1` selects A5 and drops the navigation.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/cashmemo\/vouchers\/([^\/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const print = String(query.print ?? "") === "1";
    const found = await A.payments.readPayment(db, String(match[1]));
    if (!found) return { text: "No such voucher", status: 404 };

    return routeKit.renderRoute(
      req,
      {
        user,
        active: "cashmemo",
        title: "Voucher",
        paper: print ? String(query.paper ?? "a5") : "",
        template: "cashmemo/vouchers/{id}/page.html.jinja",
      },
      {
        voucher: found,
        print,
        selectedType: found.type,
        // A sending voucher pays out, a recieving one pays in. The words matter on paper: an
        // operator reading "recieving 5,000" on a payment slip is being misinformed.
        directionText: found.type === 1 ? "Recieved" : found.type === 0 ? "Paid out" : "Returned",
      }
    );
  };
})();
