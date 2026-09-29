/**
 * Derived "views" rebuilt in JavaScript from the TrailBase base tables.
 *
 * These reproduce the PocketBase view SQL preserved verbatim in
 * `full_database_schema.sql` / `dltbl/views_from_pb/U1776088644__create_views.sql`
 * so that report output matches the old backend for the same rows. The mapping is
 * documented in `vault/references/reports-and-ledgers.md`.
 *
 * Known limitations inherited deliberately (they are in the old SQL too):
 *  - the `deleted` soft-delete flag is not applied consistently;
 *  - `ledger_*.credit/debit` do not model the return case;
 *  - `ledger_journal.stock` is always 0;
 *  - `transaction_view.profit` is total cost, not margin.
 */

import { num, round2, qtyDisplay, compareText } from "./format.js";
import { relId } from "./ids.js";

const byId = (rows) => {
  const m = new Map();
  for (const r of rows) m.set(r.id, r);
  return m;
};

const addTo = (map, key, delta) => map.set(key, (map.get(key) || 0) + delta);

/** `party_type` / `area` / `section` resolved from the invoice's party. */
function partyContext(party, parties, areas) {
  const p = party ? parties.get(party) : null;
  const area = p ? relId(p.area) : null;
  const a = area ? areas.get(area) : null;
  return { partyType: p ? relId(p.type) : null, area, section: a ? relId(a.section) : null };
}

/** transaction_view — per invoice line. */
export function buildTransactionView(base) {
  const inv = byId(base.invoices);
  const parties = byId(base.parties);
  const areas = byId(base.areas);
  const out = [];
  for (const t of base.transactions) {
    const invoice = inv.get(relId(t.invoice));
    if (!invoice) continue;
    const d1 = num(t.discount_1);
    const d2 = num(t.discount_2);
    const drs = num(t.discount_rs);
    const price = num(t.price);
    const qty = num(t.qty);
    const cost = num(t.cost_price);
    const lineTotal = price * qty * (1 - d1 / 100) * (1 - d2 / 100) - drs;
    const invD1 = num(invoice.discount_1);
    const invD2 = num(invoice.discount_2);
    const ctx = partyContext(relId(invoice.party), parties, areas);
    out.push({
      id: t.id,
      invoice: invoice.id,
      type: relId(invoice.type),
      party: relId(invoice.party),
      party_type: ctx.partyType,
      area: ctx.area,
      section: ctx.section,
      invoiceNo: num(invoice.invoiceNo),
      item: relId(t.item),
      cost_price: cost,
      price,
      qty,
      scheme: num(t.scheme),
      discount_1: d1,
      discount_2: d2,
      discount_rs: drs,
      total: lineTotal,
      inv_d1: invD1,
      inv_d2: invD2,
      inv_drs: num(invoice.discount_rs),
      net_amount: round2(lineTotal * (1 - invD1 / 100) * (1 - invD2 / 100)),
      // NOTE: named `profit` in the old SQL but it is total cost, not margin.
      profit: round2(cost * qty),
      deleted: num(t.deleted),
      created: t.created,
      updated: t.updated,
    });
  }
  return out;
}

/** invoice_view — per invoice, with invoice-level discounts applied. */
export function buildInvoiceView(base, transactionView) {
  const sum2 = new Map(); // invoice id -> Σ round2(line total)
  for (const t of transactionView) addTo(sum2, t.invoice, round2(t.total));

  const out = [];
  for (const inv of base.invoices) {
    const s = sum2.get(inv.id) || 0;
    const afterD1 = s - (s * num(inv.discount_1)) / 100;
    const unrounded = afterD1 - (afterD1 * num(inv.discount_2)) / 100;
    out.push({
      id: inv.id,
      dated: inv.dated || inv.created,
      type: relId(inv.type),
      invoiceNo: num(inv.invoiceNo),
      party: relId(inv.party),
      booker: relId(inv.booker),
      invoice_maker: relId(inv.invoice_maker),
      discount_1: num(inv.discount_1),
      discount_2: num(inv.discount_2),
      discount_rs: num(inv.discount_rs),
      total: round2(s),
      unrounded_total: unrounded,
      final_total: round2(unrounded - num(inv.discount_rs)),
      duedate: inv.duedate,
      description: inv.description,
      created: inv.created,
      updated: inv.updated,
      deleted: num(inv.deleted),
      completed: num(inv.completed),
    });
  }
  return out;
}

/** transactions_report — transaction_view + item company + invoice booker + real margin. */
export function buildTransactionsReport(base, transactionView, invoiceView) {
  const items = byId(base.items);
  const invoices = byId(invoiceView);
  const out = [];
  for (const t of transactionView) {
    const item = items.get(t.item);
    const inv = invoices.get(t.invoice);
    const unrounded = inv ? inv.unrounded_total : 0;
    const drs = t.inv_drs;
    // SQLite yields NULL (-> printf "0.00") when the denominator is 0.
    const alloc = unrounded ? (drs * t.net_amount) / unrounded : 0;
    out.push({
      ...t,
      booker: inv ? inv.booker : null,
      company: item ? relId(item.category) : null,
      final_amount: round2(t.net_amount - alloc),
      profit: round2(t.net_amount - alloc - num(t.cost_price) * num(t.qty)),
    });
  }
  return out;
}

/** payments_view — payment joined to invoice, party, area, section, booker, return ref. */
export function buildPaymentsView(base, invoiceView) {
  const inv = byId(invoiceView);
  const parties = byId(base.parties);
  const areas = byId(base.areas);
  const returnRef = new Map();
  for (const r of base.invoices_return_reference) returnRef.set(r.id, relId(r.original_invoices));
  const bookerCompanies = new Map();
  for (const l of base.order_booker_companies) {
    const key = relId(l.order_booker);
    if (!bookerCompanies.has(key)) bookerCompanies.set(key, []);
    bookerCompanies.get(key).push(relId(l.company));
  }

  const out = [];
  for (const p of base.payments) {
    const invoice = p.invoice ? inv.get(relId(p.invoice)) : null;
    const partyId = relId(p.party);
    const party = partyId ? parties.get(partyId) : null;
    const areaId = party ? relId(party.area) : null;
    const area = areaId ? areas.get(areaId) : null;
    const booker = invoice ? invoice.booker : null;
    out.push({
      id: p.id,
      created: p.created,
      updated: p.updated,
      payment_date: p.payment_date || p.created,
      invoice: invoice ? invoice.id : null,
      original_invoices: returnRef.get(p.id) ?? null,
      invoiceNo: invoice ? invoice.invoiceNo : null,
      invoice_maker: invoice ? invoice.invoice_maker : null,
      booker,
      // Was a JSON array in PocketBase; a link table now, so it can be empty.
      company: booker && bookerCompanies.has(booker) ? bookerCompanies.get(booker) : [],
      paid_to: relId(p.paid_to),
      party: partyId,
      party_type: party ? relId(party.type) : null,
      type: relId(p.type),
      amount: num(p.amount) !== 0 ? num(p.amount) : num(invoice ? invoice.final_total : 0),
      paid: num(p.paid),
      area: areaId,
      section: area ? relId(area.section) : null,
      description: p.description,
    });
  }
  return out;
}

/**
 * payments_invoices_report — a payment split across the item companies on its invoice.
 *
 * The split basis is `transactions_report.company` (the *item's* category), exactly
 * as the preserved SQL does — `payments_view.company` (the booker's companies) is a
 * different vocabulary and is not used here.
 */
export function buildPaymentsInvoicesReport(base, paymentsView, transactionsReport, invoiceView) {
  const inv = byId(invoiceView);
  const netByInvoiceCompany = new Map(); // `${invoice}|${company}` -> Σ net_amount
  for (const t of transactionsReport) {
    addTo(netByInvoiceCompany, `${t.invoice}|${t.company ?? "\u0000"}`, num(t.net_amount));
  }
  const perInvoice = new Map(); // invoice -> [{company, ratio}]
  for (const [key, sum] of netByInvoiceCompany) {
    const sep = key.indexOf("|");
    const invoice = key.slice(0, sep);
    const company = key.slice(sep + 1);
    const unrounded = inv.get(invoice)?.unrounded_total || 0;
    if (!perInvoice.has(invoice)) perInvoice.set(invoice, []);
    perInvoice.get(invoice).push({ company: company === "\u0000" ? null : company, ratio: unrounded ? sum / unrounded : 0 });
  }

  const typeMap = { 0: "purchase", 1: "sale", 2: "return" };
  const out = [];
  for (const p of paymentsView) {
    if (!p.invoice) continue;
    for (const part of perInvoice.get(p.invoice) ?? []) {
      out.push({
        id: `${p.id}|${part.company ?? ""}`,
        created: p.created,
        updated: p.updated,
        dated: p.payment_date,
        invoice: p.invoice,
        original_invoice: p.original_invoices,
        invoiceNo: p.invoiceNo,
        invoice_maker: p.invoice_maker,
        booker: p.booker,
        company: part.company,
        party: p.party,
        area: p.area,
        section: p.section,
        party_type: p.party_type,
        type: typeMap[p.type] ?? p.type,
        amount: part.ratio * num(p.amount),
        paid: p.paid,
        description: p.description,
      });
    }
  }
  return out;
}

/** items_report — signed stock per item across all its transactions. */
export function buildItemsReport(base, transactionView) {
  const signed = new Map();
  for (const t of transactionView) {
    const q = num(t.qty) + num(t.scheme);
    let delta;
    if (t.type === 2) delta = t.party_type === 0 ? q : -q; // return: customer in, supplier out
    else if (t.type === 3) delta = q; // difference
    else if (t.type === 1) delta = -q; // sale
    else delta = q; // purchase and anything else
    addTo(signed, t.item, delta);
  }
  return base.items.map((it) => ({
    id: it.id,
    name: it.name,
    created: it.created,
    updated: it.updated,
    cost_price: num(it.cost_price),
    sale_price: num(it.sale_price),
    box_size_qty: num(it.box_size_qty),
    category: relId(it.category),
    qty: signed.get(it.id) || 0,
  }));
}

/** items_difference_report — `qty + scheme` for difference invoices only. */
export function buildItemsDifferenceReport(base, transactionView) {
  const acc = new Map();
  // A stock difference is an invoice to the **Difference party** (vault/decisions/returns-are-negative-quantities.md).
  // The historical encoding was invoice type 3, and one such row exists in the imported data, so
  // both are counted — otherwise that row would silently vanish from the report.
  const differenceParty = (base.parties ?? []).find(
    (p) => String(p.name ?? "").trim().toLowerCase() === "difference"
  )?.id;
  for (const t of transactionView) {
    const legacy = t.type === 3;
    const byParty = !!differenceParty && t.party === differenceParty;
    if (!legacy && !byParty) continue;
    const q = num(t.qty) + num(t.scheme);
    // Reported as the STOCK MOVEMENT, so the number reads the same way it does on the stock report:
    // a purchase to Difference removes stock, a sale to Difference adds it. The legacy type-3 row
    // keeps its own original rule (+q).
    const delta = legacy ? q : t.type === 1 ? -q : q;
    addTo(acc, t.item, delta);
  }
  return base.items.map((it) => ({
    id: it.id,
    name: it.name,
    created: it.created,
    updated: it.updated,
    cost_price: num(it.cost_price),
    sale_price: num(it.sale_price),
    box_size_qty: num(it.box_size_qty),
    category: relId(it.category),
    qty: acc.get(it.id) || 0,
  }));
}

/** ledger_journal — payments (paid ? payment : invoice) UNION ALL expenses. */
export function buildLedgerJournal(base, paymentsView) {
  const out = [];
  for (const p of paymentsView) {
    const amount = num(p.amount);
    out.push({
      id: p.id,
      invoiceNo: p.invoiceNo,
      created: p.payment_date,
      description: p.description,
      transaction_type: p.paid ? "payment" : "invoice",
      account_type: p.type,
      party_type: p.party_type,
      accounts_recievable:
        p.type === 1 ? (p.paid ? -amount : amount) : p.type === 2 ? (p.party_type === 0 ? -amount : 0) : 0,
      accounts_payable:
        p.type === 0 ? (p.paid ? -amount : amount) : p.type === 2 ? (p.party_type === 1 ? -amount : 0) : 0,
      cash: p.paid ? (p.type === 1 ? amount : -amount) : 0,
      stock: 0,
    });
  }
  for (const e of base.expenses) {
    const amount = num(e.amount);
    out.push({
      id: e.id,
      invoiceNo: "N/A",
      created: e.created,
      description: e.description,
      transaction_type: "expense",
      account_type: "cash",
      party_type: null,
      accounts_recievable: 0,
      accounts_payable: 0,
      cash: -amount,
      stock: 0,
    });
  }
  return out;
}

/** ledger_booker — row-level credit/debit per payment (no running balance). */
export function buildLedgerBooker(paymentsView) {
  return paymentsView.map((p) => {
    const amount = num(p.amount);
    return {
      id: p.id,
      description: p.description,
      created: p.created,
      updated: p.updated,
      dated: p.payment_date,
      invoice: p.invoice,
      party: p.party,
      type: p.type,
      paid: p.paid,
      booker: p.booker,
      credit: p.type === 1 ? (p.paid ? amount : 0) : p.type === 0 ? (p.paid ? 0 : amount) : 0,
      debit: p.type === 0 ? (p.paid ? amount : 0) : p.type === 1 ? (p.paid ? 0 : amount) : 0,
    };
  });
}

/** ledger_party — the same credit/debit rules plus a running per-party balance. */
export function buildLedgerParty(paymentsView) {
  const rows = buildLedgerBooker(paymentsView).filter((r) => r.party);
  rows.sort((a, b) => compareText(a.dated, b.dated));
  // The SQL computes the balance as a correlated subquery over payment_date: sum every
  // payment of that party with `payment_date <= the row's date`. Evaluating that per row
  // is O(n^2); it depends only on (party, date), so sum the deltas per distinct date and
  // prefix-sum them. Same value, one pass per party.
  const deltasByParty = new Map(); // party -> Map(date -> Σdelta)
  for (const p of paymentsView) {
    if (!p.party) continue;
    let byDate = deltasByParty.get(p.party);
    if (!byDate) {
      byDate = new Map();
      deltasByParty.set(p.party, byDate);
    }
    const date = String(p.payment_date);
    const delta = num(p.paid) === 0 ? num(p.amount) : -num(p.amount);
    byDate.set(date, (byDate.get(date) || 0) + delta);
  }
  const prefix = new Map(); // party -> { dates: string[], sums: number[] }
  for (const [party, byDate] of deltasByParty) {
    const dates = [...byDate.keys()].sort();
    const sums = [];
    let acc = 0;
    for (const date of dates) {
      acc += byDate.get(date);
      sums.push(acc);
    }
    prefix.set(party, { dates, sums });
  }
  const balanceFor = (party, date) => {
    const p = prefix.get(party);
    if (!p) return 0;
    // last index with dates[i] <= date
    let lo = 0;
    let hi = p.dates.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (p.dates[mid] <= date) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return idx < 0 ? 0 : round2(p.sums[idx]);
  };
  for (const r of rows) r.balance = balanceFor(r.party, String(r.dated));
  return rows;
}

/** ledger_area — per party: credit = paid, debit = unpaid, balance = debit - credit. */
export function buildLedgerArea(paymentsView) {
  const acc = new Map();
  for (const p of paymentsView) {
    if (!p.party) continue;
    const entry = acc.get(p.party) || { id: p.party, party: p.party, credit: 0, debit: 0, created: p.created };
    if (num(p.paid) === 1) entry.credit += num(p.amount);
    else entry.debit += num(p.amount);
    acc.set(p.party, entry);
  }
  return [...acc.values()].map((e) => ({ ...e, balance: round2(e.debit - e.credit) }));
}

/** outstanding_summary — per-party outstanding balance (threshold |balance| >= 1). */
export function buildOutstanding(base, paymentsView) {
  const parties = byId(base.parties);
  const areas = byId(base.areas);

  // Invoice numbers that are themselves outstanding (invoice_total - paid >= 1).
  const perInvoice = new Map(); // `${party}|${invoice}` -> {unpaid, paid, invoiceNo}
  for (const p of paymentsView) {
    if (p.type !== 1 || !p.invoice) continue;
    const key = `${p.party}|${p.invoice}`;
    const e = perInvoice.get(key) || { unpaid: 0, paid: 0, invoiceNo: p.invoiceNo };
    if (num(p.paid) === 0) e.unpaid += num(p.amount);
    else e.paid += num(p.amount);
    perInvoice.set(key, e);
  }
  const outstandingNos = new Map(); // party -> Set of invoice numbers
  for (const [key, e] of perInvoice) {
    if (e.unpaid - e.paid >= 1) {
      const party = key.slice(0, key.indexOf("|"));
      if (!outstandingNos.has(party)) outstandingNos.set(party, new Set());
      if (e.invoiceNo !== null) outstandingNos.get(party).add(String(Math.trunc(num(e.invoiceNo))));
    }
  }

  const acc = new Map();
  for (const p of paymentsView) {
    if (!p.party) continue;
    if (p.type !== 1 && p.type !== 2) continue;
    const e =
      acc.get(p.party) ||
      { id: p.party, party: p.party, party_name: parties.get(p.party)?.name ?? "", invoice_total: 0, paid_total: 0, return_total: 0, booker: p.booker, area: null, section: null };
    if (p.type === 1 && num(p.paid) === 0) e.invoice_total += num(p.amount);
    if (p.type === 1 && num(p.paid) === 1) e.paid_total += num(p.amount);
    if (p.type === 2 && p.party_type === 0) e.return_total += num(p.amount);
    if (p.booker) e.booker = p.booker;
    const party = parties.get(p.party);
    if (party) {
      e.area = relId(party.area);
      e.section = e.area ? relId(areas.get(e.area)?.section) : null;
    }
    acc.set(p.party, e);
  }

  const out = [];
  for (const e of acc.values()) {
    const balance = e.invoice_total - e.paid_total - e.return_total;
    if (Math.abs(balance) < 1) continue;
    const nos = outstandingNos.get(e.party);
    out.push({
      ...e,
      invoice_nos: nos && nos.size ? [...nos].sort((a, b) => Number(a) - Number(b)).join(",") : "",
      balance: round2(balance),
    });
  }
  return out;
}

/** counts_for_row_numbers — dashboard counters. */
export function buildCounts(base) {
  const countType = (t) => base.invoices.filter((i) => relId(i.type) === t).length;
  const countPay = (t) => base.payments.filter((p) => relId(p.type) === t).length;
  return {
    areas: base.areas.length,
    sections: base.sections.length,
    // The KEY stays `categories` because that is the legacy field name the report
    // shape consumes; the SOURCE is now `companies`, which is the same list under
    // the name the legacy UI actually used.
    categories: base.companies.length,
    purchase_invoices: countType(0),
    sale_invoices: countType(1),
    return_invoices: countType(2),
    items: base.items.length,
    order_bookers: base.order_bookers.length,
    parties: base.parties.length,
    recieving_payments: countPay(1),
    sending_payments: countPay(0),
  };
}

/** refs — the reference lists the templates and filter dropdowns read. */
export function buildRefs(base) {
  return {
    sections: base.sections,
    // no `categories` entry: the legacy categories collection maps onto `companies`,
    // and consumers of the company list read `refs.companies`.
    companies: base.companies,
    areas: base.areas,
    parties: base.parties,
    bookers: base.order_bookers,
    items: base.items,
    partyTypes: base.party_types,
    invoiceTypes: base.invoice_types,
    paymentTypes: base.payment_types,
  };
}

/**
 * What each derived view reads: base tables directly, and the earlier views it
 * consumes. `refs` and `counts` are listed too, because both point into the
 * base arrays and so go stale when those arrays are replaced.
 */
export const VIEW_DEPS = {
  transactionView: { tables: ["transactions", "invoices", "parties", "areas"], views: [] },
  invoiceView: { tables: ["invoices"], views: ["transactionView"] },
  transactionsReport: { tables: ["items"], views: ["transactionView", "invoiceView"] },
  paymentsView: {
    tables: ["payments", "invoices_return_reference", "order_booker_companies", "parties", "areas"],
    views: ["invoiceView"],
  },
  paymentsInvoicesReport: { tables: [], views: ["paymentsView", "transactionsReport", "invoiceView"] },
  itemsReport: { tables: ["items"], views: ["transactionView"] },
  itemsDifferenceReport: { tables: ["items"], views: ["transactionView"] },
  ledgerJournal: { tables: ["expenses"], views: ["paymentsView"] },
  ledgerBooker: { tables: [], views: ["paymentsView"] },
  ledgerParty: { tables: [], views: ["paymentsView"] },
  ledgerArea: { tables: [], views: ["paymentsView"] },
  outstanding: { tables: ["parties", "areas"], views: ["paymentsView"] },
  counts: {
    tables: ["invoices", "payments", "areas", "sections", "companies", "items", "order_bookers", "parties"],
    views: [],
  },
  refs: {
    tables: [
      "sections",
      "companies",
      "areas",
      "parties",
      "order_bookers",
      "items",
      "party_types",
      "invoice_types",
      "payment_types",
    ],
    views: [],
  },
};

/** Topological order: every view comes after the views it consumes. */
export const VIEW_ORDER = Object.keys(VIEW_DEPS);

/** Build one view from the base tables plus the views already built. */
export function buildView(name, base, built) {
  switch (name) {
    case "transactionView":
      return buildTransactionView(base);
    case "invoiceView":
      return buildInvoiceView(base, built.transactionView);
    case "transactionsReport":
      return buildTransactionsReport(base, built.transactionView, built.invoiceView);
    case "paymentsView":
      return buildPaymentsView(base, built.invoiceView);
    case "paymentsInvoicesReport":
      return buildPaymentsInvoicesReport(base, built.paymentsView, built.transactionsReport, built.invoiceView);
    case "itemsReport":
      return buildItemsReport(base, built.transactionView);
    case "itemsDifferenceReport":
      return buildItemsDifferenceReport(base, built.transactionView);
    case "ledgerJournal":
      return buildLedgerJournal(base, built.paymentsView);
    case "ledgerBooker":
      return buildLedgerBooker(built.paymentsView);
    case "ledgerParty":
      return buildLedgerParty(built.paymentsView);
    case "ledgerArea":
      return buildLedgerArea(built.paymentsView);
    case "outstanding":
      return buildOutstanding(base, built.paymentsView);
    case "counts":
      return buildCounts(base);
    case "refs":
      return buildRefs(base);
    default:
      throw new Error(`Unknown view: ${name}`);
  }
}

/** The views a set of changed base tables invalidates, in rebuild order. */
export function viewsAffectedBy(tables) {
  const changed = new Set(tables);
  const dirty = new Set();
  for (const name of VIEW_ORDER) {
    const dep = VIEW_DEPS[name];
    if (dep.tables.some((t) => changed.has(t)) || dep.views.some((v) => dirty.has(v))) dirty.add(name);
  }
  return dirty;
}

/**
 * The views `names` need, plus their transitive view dependencies, in rebuild
 * order. Used to build only what a page asked for.
 */
export function viewClosure(names) {
  const need = new Set();
  const visit = (name) => {
    if (need.has(name)) return;
    const dep = VIEW_DEPS[name];
    if (!dep) return;
    need.add(name);
    for (const next of dep.views) visit(next);
  };
  for (const name of names) visit(name);
  return VIEW_ORDER.filter((name) => need.has(name));
}

/**
 * The base tables the given views read (transitively). Lets a page declare only
 * the views it needs and still get exactly the right data over the wire.
 */
export function tablesForViews(names) {
  const tables = new Set();
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const dep = VIEW_DEPS[name];
    if (!dep) return;
    for (const table of dep.tables) tables.add(table);
    for (const next of dep.views) visit(next);
  };
  for (const name of names) visit(name);
  return [...tables];
}

/**
 * Build every derived view once. `party_types`/`invoice_types`/`payment_types`
 * codes are read from the database (0 customer, 1 supplier; 0 purchase, 1 sale,
 * 2 return, 3 difference; 0 sending, 1 recieving, 2 return).
 */
export function buildViews(base) {
  const built = {};
  for (const name of VIEW_ORDER) built[name] = buildView(name, base, built);
  return built;
}

/**
 * Rebuild only the `dirty` views (a Set of names, e.g. from `viewsAffectedBy`),
 * reusing `previous` for every view that is still valid. Dirty views are rebuilt
 * in `VIEW_ORDER`, so a view always sees its dependencies already fresh.
 */
export function buildSelectedViews(base, previous, dirty) {
  const built = previous ? { ...previous } : {};
  for (const name of VIEW_ORDER) {
    if (dirty.has(name)) built[name] = buildView(name, base, built);
  }
  return built;
}
