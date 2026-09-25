/**
 * Report computation. Each function takes the prebuilt views (`ctx`) plus the
 * applied filter values and returns display-ready rows and totals, with reference
 * names already resolved — the templates only print.
 *
 * The arithmetic mirrors the preserved PocketBase view SQL (see `views.js`) and
 * the per-page calculators in the old Next.js frontend
 * (`frontend/src/app/app/reports/**`).
 */

import { num, round2, qtyDisplay, dateOnly } from "./format.js";

export const INVOICE_TYPE = { purchase: 0, sale: 1, return: 2, difference: 3 };
export const PARTY_TYPE = { customer: 0, supplier: 1 };
export const PAYMENT_TYPE = { sending: 0, recieving: 1, return: 2 };

export const INVOICE_TYPE_LABEL = { 0: "purchase", 1: "sale", 2: "return", 3: "difference" };
export const PAYMENT_TYPE_LABEL = { 0: "sending", 1: "recieving", 2: "return" };

/** id -> record maps for name resolution, built once per request. */
export function indexRefs(refs) {
  const m = (rows) => {
    const map = new Map();
    for (const r of rows) map.set(r.id, r);
    return map;
  };
  return {
    party: m(refs.parties),
    area: m(refs.areas),
    section: m(refs.sections),
    category: m(refs.categories),
    company: m(refs.companies),
    item: m(refs.items),
    booker: m(refs.bookers),
  };
}

const nameOf = (map, id) => (id ? map.get(id)?.name ?? "" : "");

const invoiceNo = (map, id) => (id ? map.get(id)?.invoiceNo ?? "" : "");

const inDateRange = (ts, from, to) => {
  if (!from && !to) return true;
  const t = String(ts || "");
  if (from && t < `${from} 00:00:00`) return false;
  if (to && t > `${to} 23:59:59.999Z`) return false;
  return true;
};

const paymentsTypeLabel = (type, description) => {
  if (type === PAYMENT_TYPE.sending) return description === "payment" ? "Purchase Payment" : "Purchase";
  if (type === PAYMENT_TYPE.recieving) return description === "payment" ? "Sale Payment" : "Sale";
  return "Return";
};

/* ------------------------------------------------------------------ payments */

/** Mirrors `reports/payments/PaymentsView.tsx` `calculator`. */
export function paymentsTotals(rows) {
  let invoiceTotal = 0, recieving = 0, recieved = 0, sending = 0, sent = 0;
  let totalPaid = 0, sendingReturns = 0, recievingReturns = 0;
  for (const p of rows) {
    if (p.type === PAYMENT_TYPE.sending) p.paid ? (sent += p.amount) : (sending += p.amount);
    else if (p.type === PAYMENT_TYPE.recieving) p.paid ? (recieved += p.amount) : (recieving += p.amount);
    else p.party_type === PARTY_TYPE.customer ? (recievingReturns += p.amount) : (sendingReturns += p.amount);
    p.paid ? (totalPaid += p.amount) : (invoiceTotal += p.amount);
  }
  return {
    recieving: num(recieving).toFixed(2),
    recieved: num(recieved).toFixed(2),
    sending: num(sending).toFixed(2),
    sent: num(sent).toFixed(2),
    recievingReturns: num(recievingReturns).toFixed(2),
    sendingReturns: num(sendingReturns).toFixed(2),
    invoiceTotal: num(invoiceTotal).toFixed(2),
    totalPaid: num(totalPaid).toFixed(2),
    totalRecieving: num(recieving - recieved - recievingReturns).toFixed(2),
    totalSending: num(sending - sent - sendingReturns).toFixed(2),
    total: num(invoiceTotal - totalPaid).toFixed(2),
  };
}

/** Mirrors `reports/salesreport/PaymentsView.tsx` `calculator` (paid-only view). */
export function salesTotals(rows) {
  let recieving = 0, recieved = 0, recievingReturns = 0;
  for (const p of rows) {
    if (p.type === PAYMENT_TYPE.recieving) p.paid ? (recieved += p.amount) : (recieving += p.amount);
    else if (p.type === PAYMENT_TYPE.return) recievingReturns += p.amount;
  }
  return {
    recieving: num(recieving).toFixed(2),
    recieved: num(recieved).toFixed(2),
    recievingReturns: num(recievingReturns).toFixed(2),
    totalRecieving: num(recieving - recieved - recievingReturns).toFixed(2),
    total: num(recieving - recieved - recievingReturns).toFixed(2),
  };
}

function paymentRow(p, ix) {
  return {
    id: p.id,
    date: dateOnly(p.created),
    type: paymentsTypeLabel(p.type, p.description),
    invoice: invoiceNo(ix.invoiceMap, p.invoice),
    invoiceId: p.invoice,
    area: nameOf(ix.area, p.area),
    section: nameOf(ix.section, p.section),
    party: nameOf(ix.party, p.party),
    booker: nameOf(ix.booker, p.booker),
    amount: num(p.amount),
    amountText: num(p.amount).toFixed(2),
    description: p.description,
  };
}

function paymentFilters(p, f, ix) {
  if (f.booker && p.booker !== f.booker) return false;
  if (f.area && p.area !== f.area) return false;
  if (f.section && p.section !== f.section) return false;
  if (f.party && p.party !== f.party) return false;
  if (f.type !== undefined && f.type !== "" && p.type !== Number(f.type)) return false;
  if (f.invoice) {
    const ref = f.invoice;
    const matched = p.invoice === ref || p.original_invoices === ref || String(p.invoiceNo) === String(ref);
    if (!matched) return false;
  }
  return true;
}

export function reportPayments(ctx, f) {
  const ix = { ...indexRefs(ctx.refs), invoiceMap: new Map(ctx.invoiceView.map((i) => [i.id, i])) };
  const rows = ctx.paymentsView
    .filter((p) => inDateRange(p.created, f.from, f.to))
    .filter((p) => paymentFilters(p, f, ix))
    .map((p) => paymentRow(p, ix));
  return { rows, totals: paymentsTotals(rows), meta: { from: f.from, to: f.to } };
}

export function reportSalesPayments(ctx, f) {
  const ix = { ...indexRefs(ctx.refs), invoiceMap: new Map(ctx.invoiceView.map((i) => [i.id, i])) };
  const rows = ctx.paymentsView
    .filter((p) => inDateRange(p.created, f.from, f.to))
    .filter((p) => num(p.paid) === 0 && (p.type === PAYMENT_TYPE.recieving || p.type === PAYMENT_TYPE.return))
    .filter((p) => paymentFilters(p, f, ix))
    .map((p) => paymentRow(p, ix));
  return { rows, totals: salesTotals(rows), meta: { from: f.from, to: f.to } };
}

export function reportPaymentsByCompany(ctx, f) {
  const ix = indexRefs(ctx.refs);
  const invoiceMap = new Map(ctx.invoiceView.map((i) => [i.id, i]));
  const rows = ctx.paymentsInvoicesReport
    .filter((p) => {
      if (!["sale", "return", "recieving"].includes(p.type)) return false;
      if (f.applyDate !== false && !inDateRange(p.dated, f.from, f.to)) return false;
      if (f.company && p.company !== f.company) return false;
      if (f.party && p.party !== f.party) return false;
      if (f.area && p.area !== f.area) return false;
      if (f.section && p.section !== f.section) return false;
      if (f.booker && p.booker !== f.booker) return false;
      if (f.invoice && p.invoice !== f.invoice && String(p.invoiceNo) !== String(f.invoice)) return false;
      return true;
    })
    .map((p) => ({
      id: p.id,
      date: dateOnly(p.created),
      type: p.description === "payment" ? `${p.type} payment` : `${p.type} invoice`,
      invoice: invoiceNo(invoiceMap, p.invoice),
      originalInvoice: "",
      area: nameOf(ix.area, p.area),
      section: nameOf(ix.section, p.section),
      company: nameOf(ix.category, p.company),
      party: nameOf(ix.party, p.party),
      booker: nameOf(ix.booker, p.booker),
      amount: num(p.amount),
      amountText: num(p.amount).toFixed(2),
      paid: p.paid,
      description: p.description,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const sum = (pred) => round2(rows.reduce((t, r) => t + (pred(r) ? r.amount : 0), 0));
  const invoiceTotal = sum((r) => !r.paid && !r.type.startsWith("return"));
  const totalPaid = sum((r) => !!r.paid);
  const recievingReturns = sum((r) => r.type.startsWith("return"));
  return {
    rows,
    totals: {
      invoiceTotal: invoiceTotal.toFixed(2),
      recievingReturns: recievingReturns.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      total: round2(invoiceTotal - totalPaid - recievingReturns).toFixed(2),
    },
    meta: { from: f.from, to: f.to },
  };
}

/* ------------------------------------------------------- transactions reports */

const txFilters = (t, f, ix) => {
  if (f.company && t.company !== f.company) return false;
  if (f.party && t.party !== f.party) return false;
  if (f.booker && t.booker !== f.booker) return false;
  if (f.area && t.area !== f.area) return false;
  if (f.section && t.section !== f.section) return false;
  if (f.item && t.item !== f.item) return false;
  if (f.invoice && t.invoice !== f.invoice && String(t.invoiceNo) !== String(f.invoice)) return false;
  return true;
};

function txRow(t, ix) {
  return {
    id: t.id,
    date: dateOnly(t.created),
    type: INVOICE_TYPE_LABEL[num(t.type)] ?? "",
    booker: nameOf(ix.booker, t.booker),
    invoiceNo: t.invoiceNo,
    invoiceId: t.invoice,
    party: nameOf(ix.party, t.party),
    company: nameOf(ix.category, t.company),
    area: nameOf(ix.area, t.area),
    section: nameOf(ix.section, t.section),
    item: nameOf(ix.item, t.item),
    itemId: t.item,
    price: num(t.price),
    qty: num(t.qty),
    qtyText: qtyDisplay(ix.item.get(t.item)?.box_size_qty, t.qty),
    scheme: num(t.scheme),
    discount_1: num(t.discount_1),
    discount_2: num(t.discount_2),
    discount_rs: num(t.discount_rs),
    inv_d1: num(t.inv_d1),
    inv_d2: num(t.inv_d2),
    inv_drs: num(t.inv_drs),
    net_amount: num(t.net_amount),
    net_amountText: num(t.net_amount).toFixed(2),
    final_amount: num(t.final_amount),
    final_amountText: num(t.final_amount).toFixed(2),
    profit: num(t.profit),
    profitText: num(t.profit).toFixed(2),
  };
}

function transactionsRows(ctx, f) {
  const ix = indexRefs(ctx.refs);
  return ctx.transactionsReport
    .filter((t) => t.type === INVOICE_TYPE.sale || t.type === INVOICE_TYPE.return)
    .filter((t) => inDateRange(t.created, f.from, f.to))
    .filter((t) => txFilters(t, f, ix))
    .map((t) => txRow(t, ix))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function reportProfit(ctx, f) {
  const rows = transactionsRows(ctx, f);
  const profit = round2(
    rows.reduce((t, r) => t + (r.type === "sale" ? r.profit : -r.profit), 0)
  );
  return { rows, totals: { profit: profit.toFixed(2) }, meta: { from: f.from, to: f.to } };
}

export function reportItemSales(ctx, f) {
  const rows = transactionsRows(ctx, f);
  const sale = round2(rows.reduce((t, r) => t + (r.type === "sale" ? r.final_amount : 0), 0));
  const returns = round2(rows.reduce((t, r) => t + (r.type !== "sale" ? r.final_amount : 0), 0));
  return {
    rows,
    totals: { sale: sale.toFixed(2), returns: returns.toFixed(2), total: round2(sale - returns).toFixed(2) },
    meta: { from: f.from, to: f.to },
  };
}

/* --------------------------------------------------------------- stock / diff */

function stockRows(ctx, f) {
  const ix = indexRefs(ctx.refs);
  return ctx.itemsReport
    .filter((r) => !f.company || r.category === f.company)
    .map((r) => ({
      id: r.id,
      company: nameOf(ix.category, r.category),
      name: r.name,
      cost_price: num(r.cost_price),
      sale_price: num(r.sale_price),
      qty: num(r.qty),
      qtyText: qtyDisplay(r.box_size_qty, r.qty),
      box_size_qty: num(r.box_size_qty),
      costText: num(r.cost_price).toFixed(2),
      stock_amount: round2(num(r.qty) * num(r.cost_price)),
      stockAmountText: round2(num(r.qty) * num(r.cost_price)).toFixed(2),
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function reportStock(ctx, f) {
  const rows = stockRows(ctx, f);
  const total = round2(rows.reduce((t, r) => t + r.stock_amount, 0));
  return { rows, totals: { stockAmount: total.toFixed(2) }, meta: { company: f.company } };
}

export function reportDifference(ctx, f) {
  const ix = indexRefs(ctx.refs);
  const rows = ctx.itemsDifferenceReport
    .filter((r) => !f.company || r.category === f.company)
    .map((r) => ({
      id: r.id,
      company: nameOf(ix.category, r.category),
      name: r.name,
      cost_price: num(r.cost_price),
      sale_price: num(r.sale_price),
      qty: num(r.qty),
      qtyText: qtyDisplay(r.box_size_qty, r.qty),
      box_size_qty: num(r.box_size_qty),
      tone: num(r.qty) < 0 ? "neg" : num(r.qty) > 0 ? "pos" : "",
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { rows, totals: {}, meta: { company: f.company } };
}

/* ------------------------------------------------------------------- ledgers */

const ledgerRow = (r, ix, invoiceMap) => ({
  id: r.id,
  date: dateOnly(r.created),
  invoice: invoiceNo(invoiceMap, r.invoice),
  invoiceId: r.invoice,
  entry: r.description === "payment" ? "Payment" : "Invoice",
  credit: num(r.credit),
  creditText: num(r.credit).toFixed(2),
  debit: num(r.debit),
  debitText: num(r.debit).toFixed(2),
  balance: r.balance === undefined ? null : num(r.balance),
  balanceText: r.balance === undefined ? "" : num(r.balance).toFixed(2),
  party: nameOf(ix.party, r.party),
  booker: nameOf(ix.booker, r.booker),
});

export function reportLedgerParty(ctx, f) {
  const ix = indexRefs(ctx.refs);
  const invoiceMap = new Map(ctx.invoiceView.map((i) => [i.id, i]));
  const rows = ctx.ledgerParty
    .filter((r) => !f.party || r.party === f.party)
    .filter((r) => inDateRange(r.created, f.from, f.to))
    .map((r) => ledgerRow(r, ix, invoiceMap));
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const last = rows[rows.length - 1];
  return { rows, totals: { balance: last ? last.balanceText : "0.00" }, meta: { party: f.party, from: f.from, to: f.to } };
}

export function reportLedgerBooker(ctx, f) {
  const ix = indexRefs(ctx.refs);
  const invoiceMap = new Map(ctx.invoiceView.map((i) => [i.id, i]));
  const rows = ctx.ledgerBooker
    .filter((r) => !f.booker || r.booker === f.booker)
    .filter((r) => inDateRange(r.created, f.from, f.to))
    .map((r) => ledgerRow(r, ix, invoiceMap));
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const credit = round2(rows.reduce((t, r) => t + r.credit, 0));
  const debit = round2(rows.reduce((t, r) => t + r.debit, 0));
  return { rows, totals: { credit: credit.toFixed(2), debit: debit.toFixed(2), balance: round2(credit - debit).toFixed(2) }, meta: { booker: f.booker, from: f.from, to: f.to } };
}

export function reportLedgerArea(ctx, f) {
  const ix = indexRefs(ctx.refs);
  // The old view grouped arbitrary p1.created/type values; filter the source payments
  // instead so the date range and "recieving only" filter mean what the page intends.
  const rows = ctx.paymentsView
    .filter((p) => p.type === PAYMENT_TYPE.recieving)
    .filter((p) => inDateRange(p.created, f.from, f.to))
    .filter((p) => !f.area || p.area === f.area)
    .filter((p) => !f.section || p.section === f.section);
  const acc = new Map();
  for (const p of rows) {
    if (!p.party) continue;
    const e = acc.get(p.party) || { id: p.party, party: p.party, credit: 0, debit: 0 };
    if (num(p.paid) === 1) e.credit += num(p.amount);
    else e.debit += num(p.amount);
    acc.set(p.party, e);
  }
  const out = [...acc.values()]
    .map((e) => ({
      id: e.id,
      party: nameOf(ix.party, e.party),
      credit: round2(e.credit),
      debit: round2(e.debit),
      balance: round2(e.debit - e.credit),
      creditText: round2(e.credit).toFixed(2),
      debitText: round2(e.debit).toFixed(2),
      balanceText: round2(e.debit - e.credit).toFixed(2),
    }))
    .sort((a, b) => String(a.party).localeCompare(String(b.party)));
  const totals = {
    credit: round2(out.reduce((t, r) => t + r.credit, 0)).toFixed(2),
    debit: round2(out.reduce((t, r) => t + r.debit, 0)).toFixed(2),
    balance: round2(out.reduce((t, r) => t + r.balance, 0)).toFixed(2),
  };
  return { rows: out, totals, meta: { area: f.area, section: f.section, from: f.from, to: f.to } };
}

export function reportLedgerGeneral(ctx, f) {
  const open = {
    recievable: num(f.openingRecievables),
    payable: num(f.openingPayables),
    cash: num(f.openingCash),
  };
  const rows = ctx.ledgerJournal
    .filter((r) => inDateRange(r.created, f.from, f.to))
    .map((r) => ({
      id: r.id,
      date: dateOnly(r.created),
      invoiceNo: r.invoiceNo ?? "",
      description: r.description ?? "",
      transactionType: r.transaction_type,
      accountType: r.account_type,
      recievable: num(r.accounts_recievable),
      recievableText: num(r.accounts_recievable).toFixed(2),
      payable: num(r.accounts_payable),
      payableText: num(r.accounts_payable).toFixed(2),
      cash: num(r.cash),
      cashText: num(r.cash).toFixed(2),
      stock: num(r.stock),
      stockText: num(r.stock).toFixed(2),
      tone:
        r.transaction_type === "payment" || r.transaction_type === "expense"
          ? r.account_type === PAYMENT_TYPE_LABEL[1]
            ? "pos"
            : "neg"
          : r.account_type === PAYMENT_TYPE_LABEL[0]
            ? "info"
            : "",
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const sum = (pick) => round2(rows.reduce((t, r) => t + pick(r), 0));
  const opening = {
    date: "",
    invoiceNo: "",
    description: "Opening Balance",
    transactionType: "",
    accountType: "",
    recievable: open.recievable,
    recievableText: open.recievable.toFixed(2),
    payable: open.payable,
    payableText: open.payable.toFixed(2),
    cash: open.cash,
    cashText: open.cash.toFixed(2),
    stock: 0,
    stockText: "0.00",
    tone: "",
  };
  const totals = {
    recievable: round2(open.recievable + sum((r) => r.recievable)).toFixed(2),
    payable: round2(open.payable + sum((r) => r.payable)).toFixed(2),
    cash: round2(open.cash + sum((r) => r.cash)).toFixed(2),
    stock: "0.00",
  };
  return { rows, opening, totals, meta: { from: f.from, to: f.to } };
}

/* -------------------------------------------------- daily sale / outstanding */

export function reportDailySale(ctx, f) {
  const ix = indexRefs(ctx.refs);
  const rows = ctx.invoiceView
    .filter((i) => i.type === INVOICE_TYPE.sale)
    .filter((i) => inDateRange(i.dated, f.from, f.to))
    .filter((i) => !f.booker || i.booker === f.booker)
    .filter((i) => {
      if (!f.area && !f.section) return true;
      const party = ix.party.get(i.party);
      const area = party ? party.area : null;
      if (f.area && area !== f.area) return false;
      if (f.section && ix.area.get(area)?.section !== f.section) return false;
      return true;
    })
    .map((i) => ({
      id: i.id,
      invoiceNo: i.invoiceNo,
      party: nameOf(ix.party, i.party),
      area: nameOf(ix.area, ix.party.get(i.party)?.area),
      booker: nameOf(ix.booker, i.booker),
      total: num(i.total),
      totalText: num(i.total).toFixed(2),
    }))
    .sort((a, b) => num(a.invoiceNo) - num(b.invoiceNo));
  const total = round2(rows.reduce((t, r) => t + r.total, 0));
  return { rows, totals: { total: total.toFixed(2) }, meta: { from: f.from, to: f.to } };
}

export function reportOutstanding(ctx, f) {
  const rows = ctx.outstanding
    .filter((r) => !f.booker || r.booker === f.booker)
    .filter((r) => !f.area || r.area === f.area)
    .filter((r) => !f.section || r.section === f.section)
    .map((r) => ({
      id: r.id,
      party_name: r.party_name,
      invoice_nos: r.invoice_nos ?? "",
      invoice_total: num(r.invoice_total),
      paid_total: num(r.paid_total),
      balance: num(r.balance),
      invoice_totalText: num(r.invoice_total).toFixed(2),
      paid_totalText: num(r.paid_total).toFixed(2),
      balanceText: num(r.balance).toFixed(2),
    }))
    .sort((a, b) => String(a.party_name).localeCompare(String(b.party_name)));
  const sum = (p) => round2(rows.reduce((t, r) => t + p(r), 0));
  return {
    rows,
    totals: {
      invoice: sum((r) => r.invoice_total).toFixed(2),
      paid: sum((r) => r.paid_total).toFixed(2),
      balance: sum((r) => r.balance).toFixed(2),
    },
    meta: { booker: f.booker, area: f.area, section: f.section },
  };
}

export function reportProductSale(ctx, f) {
  const ix = indexRefs(ctx.refs);
  const acc = new Map();
  for (const t of ctx.transactionView) {
    if (t.type !== INVOICE_TYPE.sale) continue;
    if (!inDateRange(t.created, f.from, f.to)) continue;
    if (f.booker && t.booker !== f.booker) continue;
    if (f.area && t.area !== f.area) continue;
    if (f.section && t.section !== f.section) continue;
    const e = acc.get(t.item) || { id: t.item, name: nameOf(ix.item, t.item), units: 0, amount: 0 };
    e.units += num(t.qty);
    e.amount += num(t.total);
    acc.set(t.item, e);
  }
  const rows = [...acc.values()]
    .filter((e) => e.units > 0)
    .map((e) => ({
      id: e.id,
      name: e.name,
      qtyText: qtyDisplay(ix.item.get(e.id)?.box_size_qty, e.units),
      amount: e.amount,
      amountText: num(e.amount).toFixed(2),
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const total = round2(rows.reduce((t, r) => t + r.amount, 0));
  return { rows, totals: { amount: total.toFixed(2) }, meta: { from: f.from, to: f.to } };
}

/* ---------------------------------------------------------------- registry */

/**
 * Report registry. `inputs` names the view arrays a report needs, so the worker
 * pool only receives the data that report actually reads.
 */
export const REPORTS = {
  payments: { title: "Unified Payments Report", inputs: ["paymentsView", "invoiceView", "refs"], run: reportPayments },
  salesreport: { title: "Sales Report", inputs: ["paymentsView", "invoiceView", "refs"], run: reportSalesPayments },
  paymentsbycompany: { title: "Payments By Company", inputs: ["paymentsInvoicesReport", "invoiceView", "refs"], run: reportPaymentsByCompany },
  profit: { title: "Profit Report", inputs: ["transactionsReport", "refs"], run: reportProfit },
  itemsales: { title: "Item Sales Report", inputs: ["transactionsReport", "refs"], run: reportItemSales },
  stockreport: { title: "Stock Report", inputs: ["itemsReport", "refs"], run: reportStock },
  difference: { title: "Difference Report", inputs: ["itemsDifferenceReport", "refs"], run: reportDifference },
  "ledgers/party": { title: "Party Ledger", inputs: ["ledgerParty", "invoiceView", "refs"], run: reportLedgerParty },
  "ledgers/booker": { title: "Booker Sales Ledger", inputs: ["ledgerBooker", "invoiceView", "refs"], run: reportLedgerBooker },
  "ledgers/area": { title: "Area Ledger", inputs: ["paymentsView", "refs"], run: reportLedgerArea },
  "ledgers/general": { title: "General Ledger", inputs: ["ledgerJournal"], run: reportLedgerGeneral },
  dailysale: { title: "Daily Sale Report", inputs: ["invoiceView", "refs"], run: reportDailySale },
  outstanding: { title: "Outstanding Payments Report", inputs: ["outstanding"], run: reportOutstanding },
  productsale: { title: "Product Supply Summary", inputs: ["transactionView", "refs"], run: reportProductSale },
};

export function runReport(name, ctx, filters) {
  const report = REPORTS[name];
  if (!report) throw new Error(`Unknown report: ${name}`);
  return report.run(ctx, filters);
}
