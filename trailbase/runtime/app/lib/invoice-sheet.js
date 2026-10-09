// The invoice SHEET render context, shared by the single-invoice view (`/invoices/<id>/view`) and the
// queued batch (`/print/queue`).
//
// One builder, so the sheet a customer receives from a single print and the sheet the queue prints are
// the same artefact. This was lifted verbatim out of `routes/invoices/{id}/view/route.ts` when the
// print queue became the legacy picker + queue; the queue route needs the identical body per invoice
// and duplicating it would let the two sheets drift.
//
// The sheet mirrors the LEGACY print (`/app/invoices/print?invoiceId=…`): header block (Party + phone,
// Address from the party's area/section, Booker + phone, Remarks, Invoice #/Date/Time), the legacy
// line columns (#, ITEM, BOX SIZE, CTN/UNTS/FREE, UNIT/CTN price, TOTAL) and the legacy totals
// (TOTAL AMOUNT, DISCOUNT 1/2, DISCOUNT cash, PAYABLE AMOUNT). Names come from the document itself
// (`doc.party_name` / `doc.booker_name`) because resolving them again from refs dropped the Party and
// Booker from the sheet entirely — the defect that fix closed.

// Legacy: `+ SALE INVOICE` / `+ PURCHASE INVOICE` / `+ RETURN INVOICE` — the sign is constant.
const TYPE_WORD = { 0: "PURCHASE", 1: "SALE", 2: "RETURN", 3: "DIFFERENCE" };

/**
 * The minijinja render context for one materialised invoice document, or `null` when the document has
 * not been materialised (an id the queue holds but `/invoice-doc/rebuild` has not built yet).
 *
 * `A` is the app bundle from `/app/lib/context.js`.
 */
export async function buildSheet(A, id) {
  const routeKit = A.routeKit;
  const doc = await A.invoiceDoc.read(String(id));
  if (!doc) return null;
  const refs = await routeKit.refs();

  // refs ids are base64; the document stores ids as hex. Key every list by HEX (b64ToHex), not the
  // other way round — the reverse conversion is what silently matched nothing before.
  const byHex = (list) => {
    const m = new Map();
    for (const r of list ?? []) {
      try { m.set(String(routeKit.b64ToHex(String(r.id))).toUpperCase(), r); } catch { /* non-id key */ }
    }
    return m;
  };
  const parties = byHex(refs.parties ?? []);
  const areas = new Map((refs.areas ?? []).map((r) => [String(r.id), r]));
  const sections = new Map((refs.sections ?? []).map((r) => [String(r.id), r]));
  const bookers = byHex(refs.bookers ?? []);
  const items = byHex(refs.items ?? []);

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
  const lines = (doc.lines ?? []).map((l, i) => {
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
  const hasLineDiscounts = lines.some((l) => l.d1Text || l.d2Text || l.drsText);

  // Carried on the data object rather than left to the template context: the same macro is included
  // from two templates, and an imported macro does not see the caller's top-level variables unless it
  // is imported `with context`. Explicit is one less foot-gun.
  const biz = globalThis.__AA_BUSINESS__ || {
    name: "SAMPLE TRADERS",
    address: "123 Sample Street, Sample City",
    phone: "000-0000000",
  };

  const data = {
    invoice: { id: String(id) },
    businessName: biz.name,
    businessAddress: biz.address,
    businessPhone: biz.phone,
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
  };
  return { data, type: Number(doc.type), invoiceNo: String(doc.invoiceNo ?? "") };
}
