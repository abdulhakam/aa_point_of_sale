/**
 * The general ledger's opening-balance row.
 *
 * A page HANDLER: JavaScript the manifest points at, loaded only for the page that declares it. This is
 * the first one ([[tb-0032]] step 4) — the workflow existed in the design and had never been wired up.
 *
 * Why this and not something else. Nothing else on a report page is page-specific: the template is
 * chosen by the manifest, the SQL comes from `spool`, and the columns/totals rendering is shared. The
 * opening balances ARE this ledger's own logic, and it was living in two shared places — the row builder
 * in `app/lib/report-pages.js`, and the "is this page the one with openings?" decision inline in the
 * dispatcher. A handler directory is the honest home for the first, and declaring it in the manifest is
 * the honest home for the second.
 *
 * What makes it page-specific: these three figures are the FILTER's, not the data's. Nothing in SQLite
 * can supply them, so there is no SQL to put them in — which is exactly the case a handler is for. (They
 * are bound into the totals statement as `spool.totals.openings`, and that part stays in SQL: it IS a
 * statement concern.)
 *
 * The row shape is what the shared report template expects, so it is unchanged from the version this
 * replaces — including `date: ""`, `invoiceNo: ""` and `transactionType: ""`, which are empty because an
 * opening balance is not a transaction.
 */

import { num } from "../../../../compute/format.js";

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
    // The template adds this row's figures into each total; see `spool.totals.derived` in meta.json,
    // where the same three are the `openR` / `openP` / `openC` terms. Both sides read the same filter
    // names, so they cannot drift apart silently.
    stock: 0,
    stockText: "0.00",
    tone: "",
  };
}
