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

// Legacy: `SALE INVOICE` / `PURCHASE INVOICE` / `RETURN INVOICE` / `DIFFERENCE INVOICE` — no sign.
const TYPE_WORD = { 0: "PURCHASE", 1: "SALE", 2: "RETURN", 3: "DIFFERENCE" };

/**
 * The minijinja render context for one materialised invoice document, or `null` when the document has
 * not been materialised (an id the queue holds but `/invoice-doc/rebuild` has not built yet).
 *
 * `A` is the app bundle from `/ahscripts/lib/context.js`.
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

  const typeLabel = (TYPE_WORD[Number(doc.type)] ?? "INVOICE") + " INVOICE";

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

  // Legacy header date/time: `Apr 11, 2026` and a 12-hour time, both read from the invoice's
  // `created` and rendered in the shop's local time (PKT). Every imported invoice on a direct-imported
  // depot carries the same `created` as v1 (verified 2026-10-09 against all 8,927 shared invoices), so
  // `created` is the right source — the legacy sheet uses it, not `dated`. NB `created` is verbatim v1
  // only on the direct-import path; a record-API load stamps it with the import time
  // ([[guest-depot-created-is-import-time]]), so this assumes a direct-imported depot.
  const invDate = A.dates.printDate(doc.created);
  const invTime = A.dates.printTime(doc.created);

  // Legacy prints a Due Date only when the due date is later than the invoice's own date; it is
  // otherwise blank. 21 imported documents carry an EMPTY `dated`, so the fallback to `created` must
  // be a truthy one (`||`, not `??`) or those invoices lose a due date the legacy sheet prints.
  const dueRaw = String(doc.duedate ?? "").slice(0, 10);
  const refRaw = String(doc.dated || doc.created || "").slice(0, 10);
  const dueDate = dueRaw && refRaw && dueRaw > refRaw ? dueRaw : "";

  // `PRINT TIME:` is the current clock on the shop's wall, not the invoice time.
  const now = A.dates.shopNow();

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
    logo: "",
  };

  const data = {
    invoice: { id: String(id) },
    businessName: biz.name,
    businessAddress: biz.address,
    businessPhone: biz.phone,
    // Optional logo (from business.json). The sheet draws it in the left header cell only when set.
    businessLogo: biz.logo ?? "",
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
    dueDate,
    nowTime: now.time,
    nowDate: now.date,
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

/**
 * The LIVE variant of `buildSheet`: the same sheet context built from the base tables through
 * `invoices.readInvoice`, NOT from the materialised `inv_doc` document.
 *
 * WHY. The materialised document is kept current by triggers, but it is still a second copy, and the
 * request behind the console's view dialog is "show the LATEST data (not from cache / invoice_doc)".
 * `readInvoice` already reads `invoices`/`transactions`/`items` directly, so this maps its output into
 * the exact `data` shape `buildSheet` produces, and the ONE `partials/invoice-sheet.html.jinja` macro renders
 * both — so the live preview and the queued printout cannot diverge in layout.
 *
 * Used by `?source=live` on `/invoices/<id>/view` (the console's view dialog and the finish-flow print
 * tab). `/print` and `/print/queue` stay on `buildSheet`/`inv_doc` — the materialised tier — on purpose.
 */
export async function buildSheetFresh(A, id) {
  const routeKit = A.routeKit;
  const db = (globalThis).sqlite;
  const inv = await A.invoices.readInvoice(db, String(id));
  if (!inv) return null;
  const refs = await routeKit.refs();

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

  const typeLabel = (TYPE_WORD[Number(inv.type)] ?? "INVOICE") + " INVOICE";
  const isSale = Number(inv.type) === 1;

  const partyRow = inv.party ? parties.get(String(routeKit.b64ToHex(String(inv.party))).toUpperCase()) : null;
  const partyName = String(inv.partyName ?? partyRow?.name ?? "");
  const partyPhone = String(partyRow?.phone ?? "");
  let partyAddress = "";
  if (isSale && partyRow) {
    const area = partyRow.area ? areas.get(String(partyRow.area)) : null;
    const section = area && area.section ? sections.get(String(area.section)) : null;
    const addr = [String(partyRow.address ?? ""), String(area?.name ?? ""), String(section?.name ?? "")].join(" - ");
    if (addr.replace(/[-\s]/g, "")) partyAddress = addr;
  }
  const bookerRow = inv.booker ? bookers.get(String(routeKit.b64ToHex(String(inv.booker))).toUpperCase()) : null;
  const bookerName = isSale ? String(inv.bookerName ?? bookerRow?.name ?? "") : "";
  const bookerPhone = isSale ? String(bookerRow?.phone ?? "") : "";

  // Legacy header date/time come from the invoice's `created`; fall back to `dated` for a row that
  // somehow has none. `readInvoice` carries `created` for exactly this.
  const created = String(inv.created || inv.dated || "");
  const invDate = A.dates.printDate(created);
  const invTime = created ? A.dates.printTime(created) : "";

  const dueRaw = String(inv.duedate ?? "").slice(0, 10);
  const refRaw = String(inv.dated || inv.created || "").slice(0, 10);
  const dueDate = dueRaw && refRaw && dueRaw > refRaw ? dueRaw : "";

  const now = A.dates.shopNow();

  const lines = (inv.lines ?? []).filter((l) => !l.deleted).map((l, i) => {
    const box = Number(l.boxSizeQty ?? 0) || 0;
    const qty = Number(l.qty ?? 0) || 0;
    const ctn = box ? Math.floor(Math.abs(qty) / box) : 0;
    const units = box ? Math.abs(qty) % box : Math.abs(qty);
    const d1 = Number(l.discount1 ?? 0) || 0;
    const d2 = Number(l.discount2 ?? 0) || 0;
    const drs = Number(l.discountRs ?? 0) || 0;
    return {
      index: i + 1,
      itemName: l.itemName ?? "",
      boxSize: box ? String(box) : "",
      ctn: String(ctn),
      units: String(units),
      free: String(Number(l.scheme ?? 0) || 0),
      unitPrice: A.format.money(l.price),
      ctnPrice: box ? A.format.money(box * (Number(l.price ?? 0) || 0)) : "",
      d1Text: d1 ? d1.toFixed(2) : "",
      d2Text: d2 ? d2.toFixed(2) : "",
      drsText: drs ? A.format.money(drs) : "",
      total: A.format.money(l.amount ?? 0),
    };
  });
  const hasLineDiscounts = lines.some((l) => l.d1Text || l.d2Text || l.drsText);

  const biz = globalThis.__AA_BUSINESS__ || {
    name: "SAMPLE TRADERS",
    address: "123 Sample Street, Sample City",
    phone: "000-0000000",
    logo: "",
  };

  const data = {
    invoice: { id: String(id) },
    businessName: biz.name,
    businessAddress: biz.address,
    businessPhone: biz.phone,
    // Optional logo (from business.json). The sheet draws it in the left header cell only when set.
    businessLogo: biz.logo ?? "",
    typeLabel,
    partyName,
    partyPhone,
    partyAddress,
    bookerName,
    bookerPhone,
    remarks: String(inv.description ?? ""),
    invoiceNo: String(inv.invoiceNo ?? ""),
    invDate,
    invTime,
    dueDate,
    nowTime: now.time,
    nowDate: now.date,
    lines,
    hasLineDiscounts,
    totals: {
      totalAmountText: A.format.money(inv.lineTotal ?? 0),
      d1Text: (Number(inv.discount1 ?? 0) || 0).toFixed(2) + "%",
      d2Text: (Number(inv.discount2 ?? 0) || 0).toFixed(2) + "%",
      cashText: A.format.money(inv.discountRs ?? 0),
      payableText: A.format.money(inv.total ?? 0),
    },
  };
  return { data, type: Number(inv.type), invoiceNo: String(inv.invoiceNo ?? "") };
}
