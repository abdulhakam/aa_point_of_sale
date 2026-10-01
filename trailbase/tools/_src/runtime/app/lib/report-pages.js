// Report page definitions and helpers for the guest app
// (REPORT_INDEX, LEDGER_INDEX, REPORT_PAGES, parseFilters, filterOptions).

import { monthStart, num, today, yearStart } from "../compute/format.js";
import { qs, qsb } from "./http.js";

/**
 * Whether this page runs the LEGACY JS report implementation instead of the spool.
 *
 * The spool is the only live path: every report runs its SQL, hands the rows to the renderer by KV
 * key, and never materialises a row in QuickJS ([[spooling-report-rows-through-kv]]). `useJs: true`
 * on a page definition re-enables `compute/reports.js` for that page alone — the escape hatch, for
 * a report whose SQL is not trustworthy yet, not a second implementation to maintain.
 *
 * Strictly `=== true`, so a stray `"true"` or `1` does not silently switch a money report back.
 */
export function useJsFor(pageDef) {
  return pageDef?.useJs === true;
}

/**
 * The general ledger's opening-balance row.
 *
 * `reportLedgerGeneral` returns this SEPARATELY from `result.rows` and adds it to each total
 * (reports.js:438-457). The three figures are the FILTER's, not the data's — there is nothing for
 * SQL to contribute — so the spooled path builds the same row from the same three inputs.
 */
export function openingRow(filters) {
  const amount = (v) => {
    const n = num(filters ? filters[v] : "");
    return { value: n, text: n.toFixed(2) };
  };
  const recievable = amount("openingRecievables");
  const payable = amount("openingPayables");
  const cash = amount("openingCash");
  return {
    date: "",
    invoiceNo: "",
    description: "Opening Balance",
    transactionType: "",
    accountType: "",
    recievable: recievable.value,
    recievableText: recievable.text,
    payable: payable.value,
    payableText: payable.text,
    cash: cash.value,
    cashText: cash.text,
    stock: 0,
    stockText: "0.00",
    tone: "",
  };
}

// `icon` mirrors the legacy tile glyph (@tabler/icons-react in
// frontend/src/app/app/reports/page.tsx and ledgers/page.tsx); the values are names in
// views/partials/icons.html. The guest renders the same icons so the hubs match the legacy UI.
export const REPORT_INDEX = [
  { title: "Unified Payments Report", target: "payments", tone: "blue", icon: "report-money" },
  { title: "Item Sales Report", target: "itemsales", tone: "pink", icon: "chart-bar" },
  { title: "Sales Report", target: "salesreport", tone: "violet", icon: "chart-pie-2" },
  { title: "Payments By Company", target: "paymentsbycompany", tone: "red", icon: "chart-area" },
  { title: "Ledgers", target: "ledgers", tone: "grape", icon: "chart-line" },
  { title: "Stock Report", target: "stockreport", tone: "green", icon: "trolley" },
  { title: "Profit Report", target: "profit", tone: "orange", icon: "chart-candle" },
  { title: "Difference Report", target: "difference", tone: "yellow", icon: "report-search" },
  { title: "Outstanding Payments", target: "outstanding", tone: "cyan", icon: "report-money" },
  { title: "Product Sale Report", target: "productsale", tone: "teal", icon: "trolley" },
  { title: "Daily Sale Report", target: "dailysale", tone: "indigo", icon: "chart-bar" },
];

export const LEDGER_INDEX = [
  { title: "Area", target: "ledgers/area", tone: "green", icon: "map" },
  { title: "Booker", target: "ledgers/booker", tone: "green", icon: "user-dollar" },
  { title: "General", target: "ledgers/general", tone: "yellow", icon: "report-money" },
  { title: "Party", target: "ledgers/party", tone: "orange", icon: "clipboard-data" },
];

const F = {
  date: (name, label) => ({ name, label, type: "date" }),
  select: (name, label, source) => ({ name, label, type: "select", source }),
  text: (name, label) => ({ name, label, type: "text" }),
  check: (name, label) => ({ name, label, type: "check" }),
};

const C = (key, label, cls) => ({ key, label, cls: cls ?? "" });
const RIGHT = "right";

const DATE = C("date", "Date");
const TYPE = C("type", "Type");
const INV = C("invoice", "Inv #");
const AREA = C("area", "Area");
const SECTION = C("section", "Section");
const PARTY = C("party", "Party");
const BOOKER = C("booker", "Booker");
const COMPANY = C("company", "Company");
const AMOUNT = C("amountText", "Amount", RIGHT);
const ITEM = C("item", "Item");
const QTY = C("qtyText", "Qty", RIGHT);
const FREE = C("scheme", "Free", RIGHT);
const CARTON = C("box_size_qty", "Carton Size", RIGHT);

const paymentsTotalsGroups = (t) => [
  {
    rows: [
      { label: "Sales Amount", value: t.recieving },
      { label: "Recieved Amount", value: t.recieved },
      { label: "Returns", value: t.recievingReturns },
      { label: "Recivable Amount", value: t.totalRecieving },
    ],
  },
  {
    rows: [
      { label: "Purchase Amount", value: t.sending },
      { label: "Paid Amount", value: t.sent },
      { label: "Returns", value: t.sendingReturns },
      { label: "Payable Amount", value: t.total },
    ],
  },
];

export const REPORT_PAGES = {
  payments: {
    title: "Unified Payments Report",
    defaults: { from: monthStart(), to: today() },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"),
      F.select("party", "Party", "parties"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"), F.select("booker", "Booker", "order_bookers"),
      F.select("type", "Payment Type", "payment_types"), F.text("invoice", "Invoice #"),
    ],
    columns: [DATE, TYPE, INV, AREA, SECTION, PARTY, BOOKER, AMOUNT],
    totals: paymentsTotalsGroups,
  },
  salesreport: {
    title: "Sales Report",
    defaults: { from: monthStart(), to: today() },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"),
      F.select("party", "Party", "parties"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"), F.select("booker", "Booker", "order_bookers"),
      F.text("invoice", "Invoice #"),
    ],
    columns: [DATE, TYPE, INV, AREA, SECTION, PARTY, BOOKER, AMOUNT],
    totals: (t) => [
      {
        rows: [
          { label: "Sales Amount", value: t.recieving },
          { label: "Recieved Amount", value: t.recieved },
          { label: "Returns", value: t.recievingReturns },
          { label: "Recivable Amount", value: t.totalRecieving },
        ],
      },
    ],
  },
  paymentsbycompany: {
    title: "Payments By Company",
    defaults: { from: monthStart(), to: today(), applyDate: "on" },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"), F.check("applyDate", "Apply Date Filter"),
      F.select("company", "Company", "companies"), F.select("party", "Party", "parties"),
      F.select("area", "Area", "areas"), F.select("section", "Section", "sections"),
      F.select("booker", "Booker", "order_bookers"),
    ],
    columns: [DATE, TYPE, INV, AREA, SECTION, COMPANY, PARTY, BOOKER, AMOUNT],
    totals: (t) => [
      {
        rows: [
          { label: "Invoice Total", value: t.invoiceTotal },
          { label: "Returns", value: t.recievingReturns },
          { label: "Total Paid", value: t.totalPaid },
          { label: "Total", value: t.total },
        ],
      },
    ],
  },
  itemsales: {
    title: "Item Sales Report",
    defaults: { from: monthStart(), to: today() },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"),
      F.select("company", "Company", "companies"), F.select("party", "Party", "parties"),
      F.select("booker", "Booker", "order_bookers"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"), F.select("item", "Item", "items"),
      F.text("invoice", "Invoice #"),
    ],
    columns: [DATE, TYPE, BOOKER, C("invoiceNo", "Inv #"), PARTY, COMPANY, AREA, SECTION, ITEM, QTY, FREE, C("final_amountText", "Total", RIGHT)],
    totals: (t) => [
      {
        rows: [
          { label: "Total Sale", value: t.sale },
          { label: "Total Returns", value: t.returns },
          { label: "Total", value: t.total },
        ],
      },
    ],
  },
  profit: {
    title: "Profit Report",
    defaults: { from: monthStart(), to: today() },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"),
      F.select("company", "Company", "companies"), F.select("party", "Party", "parties"),
      F.select("booker", "Booker", "order_bookers"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"), F.select("item", "Item", "items"),
      F.text("invoice", "Invoice #"),
    ],
    columns: [DATE, TYPE, BOOKER, C("invoiceNo", "Inv #"), PARTY, COMPANY, AREA, SECTION, ITEM, QTY, FREE, C("net_amountText", "Total", RIGHT), C("profitText", "Profit", RIGHT)],
    totals: (t) => [{ rows: [{ label: "Total Profit", value: t.profit }] }],
  },
  stockreport: {
    title: "Stock Report",
    defaults: {},
    fields: [F.select("company", "Company", "companies")],
    columns: [COMPANY, C("name", "Name"), C("costText", "CP", RIGHT), QTY, CARTON, C("stockAmountText", "Stock Amount", RIGHT)],
    totals: (t) => [{ rows: [{ label: "Total Stock", value: t.stockAmount }] }],
  },
  difference: {
    title: "Difference Report",
    defaults: {},
    fields: [F.select("company", "Company", "companies")],
    columns: [COMPANY, C("name", "Name"), CARTON, QTY],
    totals: () => [],
  },
  dailysale: {
    title: "Daily Sale Report",
    defaults: { from: today(), to: today() },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"),
      F.select("booker", "Booker", "order_bookers"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"),
    ],
    columns: [C("invoiceNo", "Invoice No"), C("party", "Customer Name"), AREA, BOOKER, C("totalText", "Total Amount", RIGHT)],
    totals: (t) => [{ rows: [{ label: "Total", value: t.total }] }],
  },
  outstanding: {
    title: "Outstanding Payments Report",
    defaults: {},
    fields: [
      F.select("booker", "Booker", "order_bookers"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"),
    ],
    columns: [
      C("party_name", "Party Name"),
      C("invoice_nos", "Invoices", "wrap"),
      C("invoice_totalText", "Total Amount", RIGHT),
      C("paid_totalText", "Total Paid", RIGHT),
      C("balanceText", "Balance", RIGHT),
    ],
    totals: (t) => [{ rows: [{ label: "Total", value: `${t.invoice} / ${t.paid} / ${t.balance}` }] }],
  },
  productsale: {
    title: "Product Sale Report",
    defaults: { from: today(), to: today() },
    fields: [
      F.date("from", "Date From"), F.date("to", "Date To"),
      F.select("booker", "Booker", "order_bookers"), F.select("area", "Area", "areas"),
      F.select("section", "Section", "sections"),
    ],
    columns: [C("name", "Product Name"), C("qtyText", "Quantity (Ctn:Unit)", RIGHT), AMOUNT],
    totals: (t) => [{ rows: [{ label: "Total", value: t.amount }] }],
  },
  "ledgers/party": {
    title: "Party Ledger",
    defaults: { from: monthStart(), to: today() },
    fields: [F.date("from", "Date From"), F.date("to", "Date To"), F.select("party", "Party", "parties")],
    columns: [DATE, INV, C("entry", "Entry"), C("creditText", "Credit", RIGHT), C("debitText", "Debit", RIGHT), C("balanceText", "Balance", RIGHT)],
    totals: (t) => [{ rows: [{ label: "Final Balance", value: t.balance }] }],
    requires: ["party"],
  },
  "ledgers/booker": {
    title: "Booker Sales Ledger",
    defaults: { from: monthStart(), to: today() },
    fields: [F.date("from", "Date From"), F.date("to", "Date To"), F.select("booker", "Booker", "order_bookers")],
    columns: [DATE, INV, C("entry", "Entry"), C("creditText", "Credit", RIGHT), C("debitText", "Debit", RIGHT)],
    totals: (t) => [
      {
        rows: [
          { label: "Total Credit", value: t.credit },
          { label: "Total Debit", value: t.debit },
          { label: "Final Balance", value: t.balance },
        ],
      },
    ],
    requires: ["booker"],
  },
  "ledgers/area": {
    title: "Area Ledger",
    defaults: { from: yearStart(), to: today() },
    fields: [F.date("from", "Date From"), F.date("to", "Date To"), F.select("area", "Area", "areas"), F.select("section", "Section", "sections")],
    columns: [PARTY, C("debitText", "Debit", RIGHT), C("creditText", "Credit", RIGHT), C("balanceText", "Balance", RIGHT)],
    totals: (t) => [
      {
        rows: [
          { label: "Total Debit", value: t.debit },
          { label: "Total Credit", value: t.credit },
          { label: "Total Balance", value: t.balance },
        ],
      },
    ],
  },
  "ledgers/general": {
    title: "General Ledger",
    defaults: { from: monthStart(), to: today() },
    fields: [F.date("from", "Date From"), F.date("to", "Date To")],
    columns: [
      C("date", "Date"),
      C("invoiceNo", "Inv #"),
      C("description", "Description"),
      C("transactionType", "Type"),
      C("accountType", "Account"),
      C("recievableText", "Recievables", RIGHT),
      C("payableText", "Payables", RIGHT),
      C("cashText", "Cash", RIGHT),
    ],
    totals: (t) => [
      {
        rows: [
          { label: "Recievables", value: t.recievable },
          { label: "Payables", value: t.payable },
          { label: "Cash", value: t.cash },
        ],
      },
    ],
    openings: true,
    view: "reports/ledgers/general.html",
  },
};

export const DEFAULT_VIEW = "reports/report.html";

export function parseFilters(pageDef, query) {
  const filters = { ...pageDef.defaults };
  for (const field of pageDef.fields) {
    if (field.type === "check") filters[field.name] = qsb(query[field.name]) ? "on" : "";
    else filters[field.name] = qs(query[field.name]);
  }
  if (filters.type !== undefined && filters.type !== "") filters.type = Number(filters.type);
  if (pageDef.openings) {
    filters.openingRecievables = qs(query.openingRecievables) || "0";
    filters.openingPayables = qs(query.openingPayables) || "0";
    filters.openingCash = qs(query.openingCash) || "0";
  }
  return filters;
}

export function filterOptions(refs, fields) {
  const bySource = {
    sections: refs.sections,
    areas: refs.areas,
    parties: refs.parties,
    order_bookers: refs.bookers,
    companies: refs.companies,
    companies: refs.companies,
    items: refs.items,
    party_types: refs.partyTypes,
    invoice_types: refs.invoiceTypes,
    payment_types: refs.paymentTypes,
  };
  const out = {};
  for (const field of fields) {
    if (field.type !== "select" || !field.source || out[field.source]) continue;
    out[field.source] = (bySource[field.source] ?? [])
      .map((r) => ({ value: String(r.id), label: String(r.name ?? r.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  return out;
}
