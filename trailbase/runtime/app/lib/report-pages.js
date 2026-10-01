// Report page helpers.
//
// The report DEFINITIONS live in `app/pages/**\/meta.json` and are read through `app/lib/pages.js`,
// which serves both `/reports/<key>` (server-rendered) and `/p/<slug>` (the JSON data endpoint). A
// report is therefore defined once, in inert data — see
// vault/issues/report-page-definitions-duplicated-and-already-divergent.md for the divergence the
// two copies had already reached before they were unified.
//
// What is left here is the two things a manifest cannot carry: the select options, which come from
// the live refs snapshot, and the general ledger's opening-balance row, which is an echo of three
// filter inputs rather than a query result.
//
// Report page definitions and helpers for the guest app
// (filterOptions, openingRow).

import { num } from "../compute/format.js";

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
