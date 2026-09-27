/** Number/date formatting shared by the report engine and the templates. */

export const num = (v, d = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Round to 2 decimals the way the PocketBase views did with `printf("%.2f")`. */
export const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

export const money = (v) => num(v).toFixed(2);

/** `2026-09-24 16:17:32.436Z` -> `2026-09-24` (PocketBase-compatible text timestamps). */
export const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09-24 ...` -> `24-Sep-2026` (matches `moment().format("DD-MMM-YYYY")`). */
export function fmtDate(v) {
  const d = dateOnly(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  return `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${m[1]}`;
}

/** Carton/unit display, mirroring the frontend's `qtyDisplay`. */
export function qtyDisplay(boxSizeQty, qty) {
  const box = num(boxSizeQty, 0) || 1;
  const n = num(qty);
  const neg = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const ctns = Math.floor(abs / box);
  const units = abs % box;
  return `${neg}${ctns} ${ctns === 1 ? "ctn" : "ctns"} ${units} ${units === 1 ? "unit" : "units"}`;
}

/** First day of the current month (UTC) as `YYYY-MM-DD`, used as a default filter. */
export function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/** Today (UTC) as `YYYY-MM-DD`. */
export function today(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Year start (UTC) as `YYYY-MM-DD`. */
export function yearStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
}

/**
 * Engine-independent text comparison for deterministic ordering.
 *
 * `String.prototype.localeCompare` is ICU-backed in Node/V8 but not in QuickJS, so the same
 * sort produced different orders in the two runtimes. This gives one total order everywhere:
 * case-insensitive first, then lowercase before uppercase.
 */
export function compareText(a, b) {
  const x = a === null || a === undefined ? "" : String(a);
  const y = b === null || b === undefined ? "" : String(b);
  const xl = x.toLowerCase();
  const yl = y.toLowerCase();
  if (xl < yl) return -1;
  if (xl > yl) return 1;
  // Case-insensitively equal (rare): tie-break with lowercase before uppercase. The keys are
  // built only here, so the hot path is two lowercases.
  const xk = x.replace(/[a-z]/g, (c) => "0" + c).replace(/[A-Z]/g, (c) => "1" + c.toLowerCase());
  const yk = y.replace(/[a-z]/g, (c) => "0" + c).replace(/[A-Z]/g, (c) => "1" + c.toLowerCase());
  if (xk < yk) return -1;
  if (xk > yk) return 1;
  return 0;
}
