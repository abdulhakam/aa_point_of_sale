// GET /invoices/<id>/view — the standalone document, from a route FOLDER (tb-0030 step 5).
//
// Rendered from the materialised inv_doc JSON rather than re-read from the base tables, so the screen
// and the printout are the same artefact. `?print=1` is the print mode: the same document, with the
// navigation dropped and A5 selected, so the printed sheet and the on-screen document cannot diverge.
//
// The sheet mirrors the LEGACY print (`/app/invoices/print?invoiceId=…`): header block (Party +
// phone, Address from the party's area/section, Booker + phone, Remarks, Invoice #/Date/Time), the
// legacy line columns (#, ITEM, BOX SIZE, CTN/UNTS/FREE, UNIT/CTN price, TOTAL) and the legacy totals
// (TOTAL AMOUNT, DISCOUNT 1/2, DISCOUNT cash, PAYABLE AMOUNT). Names come from the document itself
// (`doc.party_name` / `doc.booker_name`) — resolving them again from refs dropped the Party and
// Booker from the sheet entirely, which is the defect this fixes.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
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
    const id = String(routeKit.decode(match[1]));
    const doc = await A.invoiceDoc.read(id);
    if (!doc) return { text: "No materialised document for this invoice yet", status: 404 };
    const refs = await routeKit.refs();

    // refs ids are base64; the document stores ids as hex. Key every list by HEX (b64ToHex), not the
    // other way round — the reverse conversion is what silently matched nothing before.
    const byHex = (list: any[]) => {
      const m = new Map<string, any>();
      for (const r of list ?? []) {
        try { m.set(String(routeKit.b64ToHex(String(r.id))).toUpperCase(), r); } catch { /* non-id key */ }
      }
      return m;
    };
    const parties = byHex(refs.parties ?? []);
    const areas = new Map<string, any>((refs.areas ?? []).map((r: any) => [String(r.id), r]));
    const sections = new Map<string, any>((refs.sections ?? []).map((r: any) => [String(r.id), r]));
    const bookers = byHex(refs.bookers ?? []);
    const items = byHex(refs.items ?? []);

    // Legacy: `+ SALE INVOICE` / `+ PURCHASE INVOICE` / `+ RETURN INVOICE` — the sign is constant.
    const TYPE_WORD: Record<number, string> = { 0: "PURCHASE", 1: "SALE", 2: "RETURN", 3: "DIFFERENCE" };
    const typeLabel = "+ " + (TYPE_WORD[Number(doc.type)] ?? "INVOICE") + " INVOICE";

    // The legacy sheet renders Address and Booker ONLY on a sale invoice; a purchase/return/difference
    // sheet shows neither, even when the party happens to have an area or the invoice a booker.
    const isSale = Number(doc.type) === 1;

    // Party name/phone come from the document (already materialised). The Address is the party's own
    // `address`, then its area, then its section — legacy's `address - area - section` shape.
    const partyRow = doc.party ? parties.get(String(doc.party).toUpperCase()) : null;
    const partyName = String(doc.party_name ?? partyRow?.name ?? "");
    const partyPhone = String(doc.party_phone ?? partyRow?.phone ?? "");
    let partyAddress = "";
    if (isSale && partyRow) {
      const area = partyRow.area ? areas.get(String(partyRow.area)) : null;
      const section = area && area.section ? sections.get(String(area.section)) : null;
      const addr = [String(partyRow.address ?? ""), String(area?.name ?? ""), String(section?.name ?? "")].join(" - ");
      if (addr.replace(/[-\s]/g, "")) partyAddress = addr;
    }
    const bookerRow = doc.booker ? bookers.get(String(doc.booker).toUpperCase()) : null;
    const bookerName = isSale ? String(doc.booker_name ?? bookerRow?.name ?? "") : "";
    const bookerPhone = isSale ? String(bookerRow?.phone ?? "") : "";

    // Legacy header date/time: `Apr 11, 2026` and a 12-hour time. The TIME on the legacy sheet comes
    // from the invoice's `created`, which the import overwrites with the import timestamp
    // ([[guest-depot-created-is-import-time]]), so the time here is the dated time instead.
    const invDate = A.dates.printDate(doc.dated);
    const invTime = A.dates.printTime(doc.dated);

    // Per-line values. `d1`/`d2`/`drs` ride along because the legacy sheet prints a DISCOUNTS group when
    // any line carries one, and dropping them was a regression from the previous guest sheet.
    const lines = (doc.lines ?? []).map((l: any, i: number) => {
      const itemRow = l.item ? items.get(String(l.item).toUpperCase()) : null;
      const box = Number(itemRow?.box_size_qty ?? 0) || 0;
      const qty = Number(l.qty ?? 0) || 0;
      const ctn = box ? Math.floor(Math.abs(qty) / box) : 0;
      const units = box ? Math.abs(qty) % box : Math.abs(qty);
      const d1 = Number(l.d1 ?? 0) || 0;
      const d2 = Number(l.d2 ?? 0) || 0;
      const drs = Number(l.drs ?? 0) || 0;
      return {
        index: i + 1,
        itemName: l.item_name ?? "",
        boxSize: box ? String(box) : "",
        ctn: String(ctn),
        units: String(units),
        free: String(Number(l.scheme ?? 0) || 0),
        unitPrice: A.format.money(l.price),
        ctnPrice: box ? A.format.money(box * (Number(l.price ?? 0) || 0)) : "",
        d1Text: d1 ? d1.toFixed(2) : "",
        d2Text: d2 ? d2.toFixed(2) : "",
        drsText: drs ? A.format.money(drs) : "",
        total: String(l.total ?? A.format.money(l.total_raw ?? 0)),
      };
    });
    // The DISCOUNTS group is only printed when some line actually carries a discount, as in legacy.
    const hasLineDiscounts = lines.some((l: any) => l.d1Text || l.d2Text || l.drsText);

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
        invoice: { id },
        print,
        typeLabel,
        partyName,
        partyPhone,
        partyAddress,
        bookerName,
        bookerPhone,
        remarks: String(doc.description ?? ""),
        invoiceNo: String(doc.invoiceNo ?? ""),
        invDate,
        invTime,
        lines,
        hasLineDiscounts,
        totals: {
          totalAmountText: A.format.money(doc.total ?? 0),
          d1Text: (Number(doc.d1 ?? 0) || 0).toFixed(2) + "%",
          d2Text: (Number(doc.d2 ?? 0) || 0).toFixed(2) + "%",
          cashText: A.format.money(doc.drs ?? 0),
          payableText: A.format.money(doc.final_total ?? 0),
        },
      }
    );
  };
})();
