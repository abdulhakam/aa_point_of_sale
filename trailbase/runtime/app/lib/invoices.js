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
import { balanceOf, invoiceTotals } from "./invoice-lifecycle.js";
import { qtyAsText } from "./format-qty.js";

/** Invoice type codes — `invoice_types` in the schema. */
export const INVOICE_TYPES = {
  0: "Purchase",
  1: "Sale",
  2: "Return",
  3: "Difference",
};

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
  // No status predicate: every invoice is published (vault/decisions/no-draft-invoices-published-on-save.md).
  // The unpaid test needs the computed total and paid, so it is applied by an outer query around
  // the same statement rather than in the inner WHERE.
  const inner = LIST_SQL + 'WHERE ' + where.join(' AND ');
  return {
    params,
    sql: filters.unpaid === 'on' ? 'SELECT * FROM (' + inner + ')' : inner,
  };
}

/** Clamp a caller-supplied page number to a safe integer; anything unusable falls back. */
function clampInt(value, fallback, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * One page of the invoice list, newest first.
 *
 * `paging` is `{ limit, offset }`. LIMIT/OFFSET are inlined rather than bound: they are computed
 * integers, never user text, and the guest's parameter binding is text-only. The default is a 300-row
 * page so callers that pass no paging (the open-invoice picker) keep their old shape.
 */
export async function listInvoices(db, filters = {}, paging = {}) {
  const limit = clampInt(paging.limit, 300, 1, 1000);
  const offset = clampInt(paging.offset, 0, 0, 1000000000);
  const { sql: filtered, params } = filteredQuery(filters);
  const where = filters.unpaid === 'on' ? ' WHERE total - paid > 0.005' : '';
  const rows = await db.all(filtered + where + ' ORDER BY invoiceNo DESC, id DESC LIMIT ' + limit + ' OFFSET ' + offset, params);
  return rows.map(named(LIST_COLUMNS)).map((r) => {
    const total = round2(r.total);
    const paid = round2(r.paid);
    return {
      id: r.id,
      type: r.type,
      typeLabel: typeLabel(r.type),
      invoiceNo: Number(r.invoiceNo),
      dated: dateOnly(r.dated),
      // There is no lifecycle state any more. `completed` is a legacy column with no meaning in this
      // app — it is 0 on 8,923 of the imported invoices
      // ([[imported-completed-flag-carries-no-information]]) — so the list never reports it and the
      // status cell is derived from the balance alone.
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
    const box = Number(r.box_size_qty) || 0;
    return {
      id: r.id,
      item: r.item,
      itemName: r.itemName ?? "",
      boxSizeQty: box,
      // A negative quantity is a return, and qtyDisplay already renders the sign.
      qty,
      qtyText: String(round2(qty)),
      qtyAs: box ? qtyAsText(box, qty) : "",
      price: Number(r.price) || 0,
      // ⚠️ The EDITABLE price input carries the stored value, not `money(r.price)`.
      //
      // Legacy prices are not always 2 dp — invoice `AaEHwKG8…` has lines at `114.583333` and `58.3333`
      // (a price of 1375/12). `money()` rendered those as `114.58` and `58.33` **into an input the operator
      // can save**, which is two defects at once:
      //
      //   1. saving the form rewrites the stored price — 114.583333 becomes 114.58 — so touching an
      //      invoice silently changes the ledger;
      //   2. the browser preview recomputes from the rounded value while this module computes from the
      //      stored one, so the grid's live total disagreed with the server's by 7.39 on that invoice.
      //      Found by `tools/grid-preview-check.mjs`, which cross-checks the preview against the
      //      server-rendered total; `money()` is right for a *display* column and wrong for an input.
      //
      // `String()` keeps the full stored precision, which is also what the operator must see to know what
      // they are editing. See [[client-side-live-recalculation]].
      priceText: String(r.price ?? 0),
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

  // Header arithmetic, identical to `buildInvoiceView` in `compute/views.js` and to the grid's
  // browser copy in `app/public/js/app.js`:
  //   s = Σ round2(line total); afterD1 = s - s·d1/100; unrounded = afterD1 - afterD1·d2/100;
  //   final = round2(unrounded - discount_rs)
  const live = lines.filter((l) => !l.deleted);
  const totals = invoiceTotals(live, h);
  const lineSum = totals.lineSum;
  const total = totals.total;

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
    // A return can take an invoice below what was paid, so the balance is signed and the grid
    // labels a negative one as credit due rather than as an unpaid invoice.
    ...balanceOf(total, paid),
    balance: round2(total - paid),
    balanceText: money(round2(total - paid)),
    payments,
    paidPayments: payments.filter((p) => p.paid),
  };
}

/**
 * Everything the `/invoices/<id>` entry screen renders, as `{ options, data }` for
 * `routeKit.renderRoute`.
 *
 * Extracted so the entry WRITES — line add/remove, header save, complete/reopen — can answer an htmx
 * request by re-rendering the same screen into `#app-main` instead of a 303. One builder, so the
 * write's screen and the GET's screen cannot drift. Returns null when the invoice does not exist.
 */
export async function entryView(A, idB64, message) {
  const routeKit = A.routeKit;
  const db = (globalThis).sqlite;
  const refs = await routeKit.refs();
  const invoice = await readInvoice(db, routeKit.decode(idB64));
  if (!invoice) return null;
  return {
    options: { active: "invoices", title: "Invoice #" + invoice.invoiceNo, template: "invoices/entry.html" },
    data: {
      invoice,
      type: invoice.type,
      // A sale is paid in, a purchase is paid out.
      paymentTypeHint: invoice.type === 0 ? 0 : 1,
      // Fresh per render, so a repeated submit of the same page is one line and a line added from the
      // reloaded page is a new one.
      opKey: "line-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36),
      parties: refs.parties ?? [],
      bookers: refs.bookers ?? [],
      items: routeKit.editorItems(refs),
      // The quick-create panels' option lists.
      areas: refs.areas ?? [],
      companies: refs.companies ?? [],
      message: message ?? "",
    },
  };
}
