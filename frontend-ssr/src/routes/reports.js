import express from "express";
import { requireAuth } from "../lib/auth.js";
import { page, qs, qsb, ah } from "../lib/http.js";
import { monthStart, today, yearStart } from "../../compute/format.js";
import { REPORTS } from "../../compute/reports.js";

/** Reports index tiles (same set and labels as the old REPORTS screen). */
export const REPORT_INDEX = [
  { title: "Unified Payments Report", target: "payments", tone: "blue" },
  { title: "Item Sales Report", target: "itemsales", tone: "pink" },
  { title: "Sales Report", target: "salesreport", tone: "violet" },
  { title: "Payments By Company", target: "paymentsbycompany", tone: "red" },
  { title: "Ledgers", target: "ledgers", tone: "grape" },
  { title: "Stock Report", target: "stockreport", tone: "green" },
  { title: "Profit Report", target: "profit", tone: "orange" },
  { title: "Difference Report", target: "difference", tone: "yellow" },
  { title: "Outstanding Payments", target: "outstanding", tone: "cyan" },
  { title: "Product Sale Report", target: "productsale", tone: "teal" },
  { title: "Daily Sale Report", target: "dailysale", tone: "indigo" },
];

export const LEDGER_INDEX = [
  { title: "Area", target: "ledgers/area", tone: "green" },
  { title: "Booker", target: "ledgers/booker", tone: "green" },
  { title: "General", target: "ledgers/general", tone: "yellow" },
  { title: "Party", target: "ledgers/party", tone: "orange" },
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

/** Dual totals tables, as the old payments screens render them. */
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
      { label: "Payable Amount", value: t.totalSending },
    ],
  },
];

/**
 * Per-report page definition: template, default filters, filter inputs, table
 * columns, and how the totals block is presented. `columns` reference the
 * pre-formatted `*Text` fields the report engine produces.
 */
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
      F.select("company", "Company", "categories"), F.select("party", "Party", "parties"),
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
      F.select("company", "Company", "categories"), F.select("party", "Party", "parties"),
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
      F.select("company", "Company", "categories"), F.select("party", "Party", "parties"),
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
    fields: [F.select("company", "Company", "categories")],
    columns: [COMPANY, C("name", "Name"), C("costText", "CP", RIGHT), QTY, CARTON, C("stockAmountText", "Stock Amount", RIGHT)],
    totals: (t) => [{ rows: [{ label: "Total Stock", value: t.stockAmount }] }],
  },
  difference: {
    title: "Difference Report",
    defaults: {},
    fields: [F.select("company", "Company", "categories")],
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

const DEFAULT_VIEW = "reports/report.html";

/** Build the applied filter object from the query string, over the page defaults. */
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

/** Dropdown options for the filter sources, from the cached reference data. */
export function filterOptions(refs, fields) {
  const bySource = {
    sections: refs.sections,
    areas: refs.areas,
    parties: refs.parties,
    order_bookers: refs.bookers,
    categories: refs.categories,
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

export function reportRoutes({ config, render, reports }) {
  const router = express.Router();
  const auth = requireAuth;

  const shell = (req, active, title) => ({
    appName: config.appName,
    render,
    user: { email: req.session?.email, name: req.session?.name },
    active,
    title,
  });

  router.get("/reports", auth, (req, res) => {
    res.send(
      page(shell(req, "reports", "Reports"), "reports/index.html", {
        tiles: REPORT_INDEX,
        ledgerTiles: LEDGER_INDEX,
      })
    );
  });

  // Background refresh job state, for the colour indicator in the top bar.
  router.get("/reports/status", auth, (req, res) => res.json(reports.status()));

  /** Where to return after a form POST: same-host referer, else the dashboard. */
  function backTo(req) {
    try {
      const url = new URL(req.get("referer"));
      if (url.host === req.get("host")) return url.pathname + url.search;
    } catch {
      /* no referer, or one we cannot trust */
    }
    return "/dashboard";
  }

  // Manual trigger for the warm snapshot: probe, re-read what changed, rebuild those
  // views and re-render the affected reports. `?full=1` re-reads every table instead.
  // Answers JSON when asked, otherwise redirects back so the control works without JS.
  router.post(
    "/reports/refresh",
    auth,
    ah(async (req, res) => {
      const full = qsb(req.query.full) || qsb(req.body?.full);
      if (full) reports.invalidate();
      await reports.refresh();
      if (String(req.get("accept") || "").includes("application/json")) return res.json(reports.status());
      res.redirect(303, backTo(req));
    })
  );

  router.get("/reports/ledgers", auth, (req, res) => {
    res.send(page(shell(req, "reports", "Ledgers"), "reports/ledgers/index.html", { tiles: LEDGER_INDEX }));
  });

  for (const key of Object.keys(REPORT_PAGES)) {
    const pageDef = REPORT_PAGES[key];
    if (!REPORTS[key]) continue;
    router.get(`/reports/${key}`, auth, ah(async (req, res) => {
      const filters = parseFilters(pageDef, req.query);
        const { views } = await reports.getViews(req.token);
        const options = filterOptions(views.refs, pageDef.fields);
        const missing = (pageDef.requires ?? []).filter((name) => !filters[name]);
        const result = missing.length ? { rows: [], totals: {}, meta: {} } : await reports.run(key, req.token, filters);
        const appliedLabels = pageDef.fields
          .filter((field) => filters[field.name])
          .map((field) => {
            const raw = String(filters[field.name]);
            if (field.type === "select") {
              const hit = (options[field.source] ?? []).find((o) => o.value === raw);
              return { label: field.label, value: hit ? hit.label : raw };
            }
            if (field.type === "check") return null;
            return { label: field.label, value: raw };
          })
          .filter(Boolean);
        res.send(
          page(shell(req, "reports", pageDef.title), pageDef.view ?? DEFAULT_VIEW, {
            def: pageDef,
            basePath: `/reports/${key}`,
            filters,
            options,
            appliedLabels,
            missing,
            rows: result.rows,
            totalsGroups: pageDef.totals ? pageDef.totals(result.totals ?? {}) : [],
            opening: result.opening ?? null,
            meta: result.meta ?? {},
          })
        );
    }));
  }

  return router;
}
