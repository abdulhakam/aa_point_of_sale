// Report page helpers.
//
// The report DEFINITIONS live in `app/pages/**\/meta.json` and are read through `app/lib/pages.js`,
// which serves both `/reports/<key>` (server-rendered) and `/p/<slug>` (the JSON data endpoint). A
// report is therefore defined once, in inert data — see
// vault/issues/report-page-definitions-duplicated-and-already-divergent.md for the divergence the
// two copies had already reached before they were unified.
//
// What is left here is the one thing a manifest cannot carry: the select options, which come from the
// live refs snapshot. The general ledger's opening-balance row used to be the second — it is now a page
// HANDLER, declared by that page's manifest and loaded only for it.
//
// Report page helpers for the guest app.

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
