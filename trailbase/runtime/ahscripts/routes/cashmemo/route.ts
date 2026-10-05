// /cashmemo — the cash-memo summary, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const round2to = (v: any) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
    const range = { from: routeKit.pick(query.from, ""), to: routeKit.pick(query.to, "") };
    // Every settled payment counts, not only the standalone ones: money received against an invoice
    // is cash the shop has. The DA and voucher screens below are the *standalone* views, which is
    // where the `standalone` filter belongs. (With it here, this depot reads 0.00 / 0.00, because
    // all 26,526 of its payments are invoice-linked — cash in hand would be wrong by 48 million.)
    const recieved = await A.payments.sumPayments(db, { ...range, type: "1" });
    const sent = await A.payments.sumPayments(db, { ...range, type: "0" });
    const expenses = await A.expenses.sumExpenses(db, range);
    const inHand = round2to(recieved.recieved - sent.sent - expenses.total);

    return routeKit.renderRoute(
      req,
      { user, active: "cashmemo", title: "Cash memo", template: "cashmemo/index.html" },
      {
        filters: range,
        query,
        totals: {
          recievedText: recieved.recievedText,
          sentText: sent.sentText,
          expenseText: expenses.totalText,
          netText: A.format.money(inHand),
        },
      }
    );
  };
})();
