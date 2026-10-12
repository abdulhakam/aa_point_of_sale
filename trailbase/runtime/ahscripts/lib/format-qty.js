// A quantity in cartons and units, for the invoice screens.
//
// This is NOT the report engine's `qtyDisplay`, and must not replace it. That one is preserved
// verbatim for parity with the legacy SQL, and it renders a negative quantity as "-0 ctns 3 units"
// — the sign lands on the carton count, which reads as negative zero. Returns are now ordinary rows
// on an invoice, so the screens need a form a person can read at a glance:
//
//     -3 of 8  ->  -3 units        (not "-0 ctns 3 units")
//      8 of 8  ->  1 ctn           (not "1 ctn 0 units")
//     11 of 8  ->  1 ctn 3 units
//
// `compute/format.qtyDisplay` is untouched: the reports keep the legacy text. The two are allowed
// to differ in wording, never in the number.
export function qtyAsText(boxSizeQty, qty) {
  const box = Number(boxSizeQty) || 0;
  const n = Number(qty) || 0;
  if (!box) return String(n);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const ctns = Math.floor(abs / box);
  const units = abs % box;
  const parts = [];
  if (ctns) parts.push(`${ctns} ${ctns === 1 ? "ctn" : "ctns"}`);
  // The units are always shown, so a quantity of exactly N cartons does not silently lose its
  // "0 units" tail.
  if (units || !ctns) parts.push(`${units} ${units === 1 ? "unit" : "units"}`);
  return sign + parts.join(" ");
}
