// GET /invoices/<id>/view — the standalone document, from a route FOLDER (tb-0030 step 5).
//
// Rendered from the materialised inv_doc JSON rather than re-read from the base tables, so the screen
// and the printout are the same artefact. `?print=1` is the print mode: the same document, with the
// navigation dropped and A5 selected, so the printed sheet and the on-screen document cannot diverge.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/invoices\/([^\/]+)\/view$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const print = String(query.print ?? "") === "1";
    // A5 unless the caller names another sheet, so a till slip and a filed A4 copy are both one
    // link away and neither needs its own renderer.
    const paper = String(query.paper ?? "") || "a5";
    const doc = await A.invoiceDoc.read(String(routeKit.decode(match[1])));
    if (!doc) return { text: "No materialised document for this invoice yet", status: 404 };
    const refs = await routeKit.refs();
    const id = String(routeKit.decode(match[1]));
    // The document stores ids as hex; the app's convention is base64. `boxByHex` is the one thing
    // the document does not carry, so it is resolved once from the refs snapshot.
    const boxByHex = {};
    for (const it of refs.items ?? []) {
      boxByHex[routeKit.b64ToHex(String(it.id))] = Number(it.box_size_qty) || 0;
    }
    const lines = (doc.lines ?? []).map((l: any, i: number) => {
      const d1 = Number(l.d1 ?? 0);
      const d2 = Number(l.d2 ?? 0);
      const drs = Number(l.drs ?? 0);
      const box = boxByHex[String(l.item)] ?? 0;
      return {
        index: i + 1,
        itemName: l.item_name ?? "",
        qtyText: String(A.format.round2(l.qty)),
        qtyAs: box ? A.qtyAsText(box, l.qty) : "",
        priceText: A.format.money(l.price),
        discountText: drs ? A.format.money(drs) : d1 || d2 ? `${d1}% / ${d2}%` : "—",
        amountText: String(l.total ?? A.format.money(l.total_raw ?? 0)),
      };
    });
    const live = await A.invoices.readInvoice(db, id);
    const totals = live ? { total: live.total, paid: live.paid, balance: live.balance } : null;
    const bal = A.lifecycle.balanceOf(doc.final_total ?? 0, doc.paid_total ?? 0);
    // Party and booker are the only names the document does not carry, so they are resolved from
    // the refs snapshot using the hex ids the document stores.
    const byHex = (list: any[], hex: any) => (hex ? (list.find((r: any) => String(r.id) === routeKit.hexToB64(String(hex)))?.name ?? "") : "");

    return routeKit.renderRoute(
      req,
      {
        user,
        active: "invoices",
        title: "Invoice " + (doc.readable_id ?? ""),
        paper: print ? paper : "",
        template: "invoices/document.html",
      },
      {
        doc,
        invoice: { id },
        print,
        // The business identity comes from the layout's flat fields (businessName / businessAddress
        // / businessPhone), which every page already carries, so a document template cannot fail
        // on a `business` object that was never passed.
        typeLabel: live ? live.typeLabel : "Invoice",
        dated: (doc.dated ?? "").slice(0, 10),
        partyName: byHex(refs.parties ?? [], doc.party),
        bookerName: byHex(refs.bookers ?? [], doc.booker),
        lines,
        lineSumText: A.format.money(doc.total ?? 0),
        totalText: A.format.money(doc.final_total ?? 0),
        paidText: A.format.money(doc.paid_total ?? 0),
        remainingText: A.format.money(bal.remaining),
        creditDue: bal.creditDue,
        payments: (doc.payments ?? [])
          .filter((p: any) => Number(p.paid) === 1)
          .map((p: any) => ({
            date: String(p.payment_date ?? "").slice(0, 10),
            amountText: A.format.money(p.amount),
            description: p.description ?? "",
          })),
        // A document older than the invoice is worth saying out loud: the printout would otherwise
        // quietly disagree with the ledger.
        stale: totals ? Math.abs(totals.total - (doc.final_total ?? 0)) > 0.005 : false,
      }
    );
  };
})();
