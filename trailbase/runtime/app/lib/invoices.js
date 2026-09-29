// Invoice reads for the guest screens: the list behind `/invoices` and the detail behind
// `/invoices/{id}`.
//
// Writes go through `invoicing.js` — this module only reads, shapes and formats. The arithmetic
// here is presentation only (a line's amount, a header's total, a balance); the report engine's
// own arithmetic stays in `compute/reports.js` so the two cannot be confused.
//
// Money is displayed at 2 dp everywhere ([[money-is-2dp-everywhere]]).

import { dateOnly, money, round2 } from "../compute/format.js";
import { base64ToHex } from "./management.js";

/** Invoice type codes — `invoice_types` in the schema. */
export const INVOICE_TYPES = {
  0: "Purchase",
  1: "Sale",
  2: "Return",
  3: "Difference",
};

/** The types this app can enter. Return and Difference need their own screens (tb-0021). */
export const ENTRY_TYPES = [1, 0];

export const typeLabel = (code) => INVOICE_TYPES[Number(code)] ?? "Invoice";

/**
 * Name a result set's columns so rows can be read by name. The DB bridge returns positional
 * arrays, and a hand-counted index is a silent-wrong-number bug waiting to happen.
 */
const named = (columns) => (row) => {
  const out = {};
  for (let i = 0; i < columns.length; i++) out[columns[i]] = row[i];
  return out;
};

const LIST_COLUMNS = [
  "id", "type", "invoiceNo", "dated", "completed", "deleted", "discount_1", "discount_rs",
  "partyName", "bookerName", "total", "paid",
];

const HEAD_COLUMNS = [
  "id", "invoiceNo", "type", "dated", "duedate", "description", "completed", "deleted",
  "discount_1", "discount_2", "discount_rs", "partyId", "partyName", "bookerId", "bookerName",
];

const LINE_COLUMNS = [
  "id", "item", "itemName", "box_size_qty", "qty", "price", "cost_price",
  "discount_1", "discount_2", "discount_rs", "scheme", "deleted",
];

const PAYMENT_COLUMNS = ["id", "amount", "paid", "payment_date", "description", "type", "partyName", "paidTo"];

const LIST_SQL =
  'SELECT i."id" AS id, i."type" AS type, i."invoiceNo" AS invoiceNo, i."dated" AS dated, ' +
  'i."completed" AS completed, i."deleted" AS deleted, i."discount_1" AS discount_1, ' +
  'i."discount_rs" AS discount_rs, pa."name" AS partyName, bo."name" AS bookerName, ' +
  // Σ round2(line total) — the same line arithmetic `compute/views.js` uses, so this screen and
  // the reports cannot disagree — then the header's percent discounts and its rupee discount.
  'ROUND(COALESCE(t.total, 0) * (1 - COALESCE(i."discount_1", 0) / 100.0) * (1 - COALESCE(i."discount_2", 0) / 100.0) - COALESCE(i."discount_rs", 0), 2) AS total, ' +
  'COALESCE(p.paid, 0) AS paid ' +
  'FROM invoices i ' +
  'LEFT JOIN parties pa ON pa."id" = i."party" ' +
  'LEFT JOIN order_bookers bo ON bo."id" = i."booker" ' +
  'LEFT JOIN (SELECT "invoice", ROUND(SUM(ROUND((("qty" * "price") * (1 - COALESCE("discount_1", 0) / 100.0) * (1 - COALESCE("discount_2", 0) / 100.0)) - COALESCE("discount_rs", 0), 2)), 2) AS total ' +
  '          FROM transactions WHERE "deleted" = 0 GROUP BY "invoice") t ON t."invoice" = i."id" ' +
  // Only settled rows count as paid: a `paid = 0` row against an invoice is the ledger's *invoice*
  // side (`buildLedgerJournal` in `compute/views.js`), not money received. In the imported depot
  // every such row is a 0.00 "Invoice Created" placeholder, but the distinction is real.
  'LEFT JOIN (SELECT "invoice", ROUND(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 2) AS paid ' +
  '          FROM payments WHERE "invoice" IS NOT NULL GROUP BY "invoice") p ON p."invoice" = i."id" ';

/** The invoice list, newest first, capped so a wide filter cannot build an unbounded page. */
/** The filtered statement, shared by the list and the totals so the two cannot disagree. */
function filteredQuery(filters) {
  const where = ['i."deleted" = 0'];
  const params = [];
  const type = filters.type === undefined || filters.type === "" ? "" : Number(filters.type);
  if (type in INVOICE_TYPES) {
    where.push('i."type" = ?');
    params.push(String(type));
  }
  if (filters.from) {
    where.push('date(i."dated") >= date(?)');
    params.push(String(filters.from));
  }
  if (filters.to) {
    where.push('date(i."dated") <= date(?)');
    params.push(String(filters.to));
  }
  if (filters.party) {
    where.push('i."party" = ?');
    params.push(String(filters.party));
  }
  // The unpaid test needs the computed total and paid, so it is applied by an outer query around
  // the same statement rather than in the inner WHERE.
  const inner = LIST_SQL + 'WHERE ' + where.join(' AND ');
  return {
    params,
    sql: filters.unpaid === 'on' ? 'SELECT * FROM (' + inner + ')' : inner,
  };
}

export async function listInvoices(db, filters = {}) {
  const { sql: filtered, params } = filteredQuery(filters);
  const where = filters.unpaid === 'on' ? ' WHERE total - paid > 0.005' : '';
  const rows = await db.all(filtered + where + ' ORDER BY invoiceNo DESC, id DESC LIMIT 300', params);
  return rows.map(named(LIST_COLUMNS)).map((r) => {
    const total = round2(r.total);
    const paid = round2(r.paid);
    return {
      id: r.id,
      type: r.type,
      typeLabel: typeLabel(r.type),
      invoiceNo: Number(r.invoiceNo),
      dated: dateOnly(r.dated),
      completed: Number(r.completed) === 1,
      partyName: r.partyName ?? "",
      bookerName: r.bookerName ?? "",
      total,
      totalText: money(total),
      paid,
      paidText: money(paid),
      balance: round2(total - paid),
      balanceText: money(round2(total - paid)),
    };
  });
}

/**
 * Count and sums over the *whole* filtered set, not the page. The list is capped at 300 rows, so
 * summing the page would understate a month of invoices.
 */
export async function sumInvoices(db, filters = {}) {
  const { sql, params } = filteredQuery(filters);
  const where = filters.unpaid === 'on' ? ' WHERE total - paid > 0.005' : '';
  const rows = await db.all(
    'SELECT COUNT(*) AS n, ROUND(COALESCE(SUM(total), 0), 2) AS total, ROUND(COALESCE(SUM(paid), 0), 2) AS paid ' +
      'FROM (' + sql + where + ')',
    params
  );
  const r = named(["n", "total", "paid"])(rows?.[0] ?? []);
  const total = round2(r.total);
  const paid = round2(r.paid);
  return {
    count: Number(r.n) || 0,
    total,
    totalText: money(total),
    paid,
    paidText: money(paid),
    balance: round2(total - paid),
    balanceText: money(round2(total - paid)),
  };
}

/** Head + lines + the payments already made against one invoice. */
export async function readInvoice(db, publicId) {
  const hex = base64ToHex(String(publicId || ""));
  if (!hex) return null;

  const head = await db.all(
    'SELECT i."id" AS id, i."invoiceNo" AS invoiceNo, i."type" AS type, i."dated" AS dated, ' +
      'i."duedate" AS duedate, i."description" AS description, i."completed" AS completed, ' +
      'i."deleted" AS deleted, i."discount_1" AS discount_1, i."discount_2" AS discount_2, ' +
      'i."discount_rs" AS discount_rs, i."party" AS partyId, pa."name" AS partyName, ' +
      'i."booker" AS bookerId, bo."name" AS bookerName ' +
      'FROM invoices i LEFT JOIN parties pa ON pa."id" = i."party" ' +
      'LEFT JOIN order_bookers bo ON bo."id" = i."booker" WHERE i."id" = unhex(?)',
    [hex]
  );
  if (!head || !head.length) return null;
  const h = named(HEAD_COLUMNS)(head[0]);

  const lineRows = await db.all(
    'SELECT t."id" AS id, t."item" AS item, it."name" AS itemName, it."box_size_qty" AS box_size_qty, ' +
      't."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price, t."discount_1" AS discount_1, ' +
      't."discount_2" AS discount_2, t."discount_rs" AS discount_rs, t."scheme" AS scheme, ' +
      't."deleted" AS deleted ' +
      'FROM transactions t LEFT JOIN items it ON it."id" = t."item" ' +
      'WHERE t."invoice" = unhex(?) ORDER BY t."id"',
    [hex]
  );

  const lines = lineRows.map(named(LINE_COLUMNS)).map((r) => {
    const qty = Number(r.qty) || 0;
    const d1 = Number(r.discount_1) || 0;
    const d2 = Number(r.discount_2) || 0;
    const drs = Number(r.discount_rs) || 0;
    // The legacy line total, kept in `compute/views.js` too: the percent discounts compound and
    // the rupee discount is subtracted after them.
    const raw = (Number(r.price) || 0) * qty * (1 - d1 / 100) * (1 - d2 / 100) - drs;
    return {
      id: r.id,
      item: r.item,
      itemName: r.itemName ?? "",
      boxSizeQty: Number(r.box_size_qty) || 0,
      qty,
      qtyText: String(round2(qty)),
      price: Number(r.price) || 0,
      priceText: money(r.price),
      costPrice: Number(r.cost_price) || 0,
      discount1: d1,
      discount2: d2,
      discountRs: drs,
      scheme: Number(r.scheme) || 0,
      deleted: Number(r.deleted) === 1,
      amount: round2(raw),
      amountText: money(round2(raw)),
    };
  });

  // Header arithmetic, identical to `buildInvoiceView` in `compute/views.js`:
  //   s = Σ round2(line total); afterD1 = s - s·d1/100; unrounded = afterD1 - afterD1·d2/100;
  //   final = round2(unrounded - discount_rs)
  const live = lines.filter((l) => !l.deleted);
  const lineSum = round2(live.reduce((sum, l) => sum + l.amount, 0));
  const afterD1 = lineSum - (lineSum * (Number(h.discount_1) || 0)) / 100;
  const unrounded = afterD1 - (afterD1 * (Number(h.discount_2) || 0)) / 100;
  const total = round2(unrounded - (Number(h.discount_rs) || 0));

  const payRows = await db.all(
    'SELECT p."id" AS id, p."amount" AS amount, p."paid" AS paid, p."payment_date" AS payment_date, ' +
      'p."description" AS description, p."type" AS type, pa."name" AS partyName, bo."name" AS paidTo ' +
      'FROM payments p LEFT JOIN parties pa ON pa."id" = p."party" ' +
      'LEFT JOIN order_bookers bo ON bo."id" = p."paid_to" ' +
      'WHERE p."invoice" = unhex(?) ORDER BY p."payment_date" DESC, p."id" DESC',
    [hex]
  );
  const payments = payRows.map(named(PAYMENT_COLUMNS)).map((p) => ({
    id: p.id,
    amount: round2(p.amount),
    amountText: money(p.amount),
    // A 0.00 unpaid row is the ledger's invoice-side placeholder, not a payment.
    paid: Number(p.paid) === 1,
    date: dateOnly(p.payment_date),
    description: p.description ?? "",
    type: p.type === null ? null : Number(p.type),
    partyName: p.partyName ?? "",
    paidTo: p.paidTo ?? "",
  }));
  const paid = round2(payments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0));

  return {
    id: String(publicId),
    invoiceNo: Number(h.invoiceNo),
    type: h.type,
    typeLabel: typeLabel(h.type),
    dated: dateOnly(h.dated),
    duedate: dateOnly(h.duedate),
    description: h.description ?? "",
    completed: Number(h.completed) === 1,
    deleted: Number(h.deleted) === 1,
    party: h.partyId ?? null,
    partyName: h.partyName ?? "",
    booker: h.bookerId ?? null,
    bookerName: h.bookerName ?? "",
    discount1: Number(h.discount_1) || 0,
    discount2: Number(h.discount_2) || 0,
    discountRs: Number(h.discount_rs) || 0,
    lines,
    lineTotal: lineSum,
    lineTotalText: money(lineSum),
    total,
    totalText: money(total),
    paid,
    paidText: money(paid),
    balance: round2(total - paid),
    balanceText: money(round2(total - paid)),
    payments,
  };
}

/** Items offered by the line editor, already reduced to what the form needs. */
export async function itemChoices(db) {
  const rows = await db.all(
    'SELECT it."id", it."name", it."sale_price", it."cost_price", it."box_size_qty" ' +
      'FROM items it JOIN (SELECT DISTINCT "item" FROM transactions) u ON u."item" = it."id" ' +
      'ORDER BY it."name" LIMIT 500',
    []
  );
  return rows.map((r) => ({
    id: r[0],
    name: r[1],
    price: Number(r[2]) || 0,
    costPrice: Number(r[3]) || 0,
    boxSizeQty: Number(r[4]) || 0,
  }));
}
