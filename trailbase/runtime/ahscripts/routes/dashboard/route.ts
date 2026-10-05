// /dashboard — the landing tiles, from a route FOLDER (tb-0030 step 5).
//
// The auth gate is the folder's own: the dispatcher gated every authenticated route before its
// branches, and a folder bypasses the dispatcher. See `app/lib/route-kit.js` `userOf`/`loginRedirect`.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const c = await A.baseviews.counts();
    const tiles = [
      { label: "Sections", value: c.sections },
      { label: "Areas", value: c.areas },
      { label: "Item Companies", value: c.categories },
      { label: "Parties", value: c.parties },
      { label: "Order Bookers", value: c.order_bookers },
      { label: "Items", value: c.items },
      { label: "Purchase Invoices", value: c.purchase_invoices },
      { label: "Sale Invoices", value: c.sale_invoices },
      { label: "Return Invoices", value: c.return_invoices },
      { label: "Recieving Payments", value: c.recieving_payments },
      { label: "Sending Payments", value: c.sending_payments },
    ];

    return routeKit.renderRoute(
      req,
      { user, active: "dashboard", title: "Dashboard", template: "dashboard/index.html" },
      {
        tiles,
        shortcuts: [
          { title: "Reports", target: "reports", tone: "pink" },
          { title: "Management", target: "management", tone: "gray" },
        ],
      }
    );
  };
})();
