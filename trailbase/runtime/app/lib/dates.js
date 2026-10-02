// dates — the DATA-DERIVED default date window for report pages.
//
// A report page used to default to `monthStart()` / `today()`, which is `new Date()` inside the
// guest. On 2026-10-02 that opened every report on 2026-10-01 → 2026-10-02, and the only rows on
// screen were the imported payments that carry no date and fall back to their insert timestamp —
// the page looked populated and was answering the wrong question.
//
// The window is the MONTH the newest entered date falls in, from its first day to that date itself.
// Not "today" as the upper bound: there is nothing after it, so an upper bound of today only widens
// the window with days that cannot match and makes a cache key look data-dependent when it is not.
//
// `source` is REQUIRED, because the newest date is not one number. Measured on this depot: the
// newest entered PAYMENT date is 2026-04-11, while three invoices carry 2026-10-02. One global
// maximum is therefore right for an invoice report and empty for a payment report — the same defect
// wearing a different hat. A page's manifest names the source its own filter reads, which is only
// knowable there: `pv.payment_date` for payments and every ledger, `tr.dated` for the transaction
// reports, `iv.dated` for dailysale.
//
// The definition of "newest" is `app/sql/latest_business_date.sql`, read off disk and run — the same
// shape `refs.js` uses for `refs.sql`, so the rule lives in SQL and this module only transports and
// caches it. Cached on the live data fingerprint: a new invoice moves it, and reading the fingerprint
// is one indexed row, cheaper than re-running the probe per request.
//
// A source with no entered date yields `{from: "", to: ""}` and the caller leaves the manifest's own
// default in place. An empty depot is a real state (a fresh install), and "no data anywhere" must not
// become "no default at all".

import { monthStart } from "../compute/format.js";

const DATES_SQL = "/app/sql/latest_business_date.sql";

/** The column the loader reads for a source. `all` is the fallback when a manifest names none. */
const SOURCE_COLUMN = { invoice: "latest_invoice", payments: "latest_payment" };

let cached = null;
let cachedFor = null;

/** `{invoice, payments, all}` — each a `YYYY-MM-DD` or `""`. One probe, one read. */
export async function latestDates(fingerprint) {
  if (cached && cachedFor === fingerprint) return cached;
  const sql = stripTrailingSemicolon(await fs.readFile(DATES_SQL));
  const rows = await sqlite.all(sql, []);
  const row = (rows ?? [])[0];
  // The bridge hands back rows positionally for a hand-written `SELECT`, but an object row is
  // accepted too, so read both. `MAX()` over no rows is NULL, not an error, and NULL must become ""
  // rather than the string "null" travelling into a `<input type="date">`.
  // Plain JS, not TS: `loadModule` evals an `app/lib/*.js` file as-is, so a type annotation here is a
// syntax error rather than something stripped. `route.ts` is the only file that is transpiled.
const pick = (key) => {
    const raw = Array.isArray(row) ? row[key === "latest_invoice" ? 0 : 1] : row?.[key];
    return raw === null || raw === undefined ? "" : String(raw).slice(0, 10);
  };
  const invoice = pick("latest_invoice");
  const payments = pick("latest_payment");
  cached = {
    invoice,
    payments,
    // The later of the two, as text: `YYYY-MM-DD` compares correctly, and a "" is the smallest value
    // there is, so an absent source can never win.
    all: invoice > payments ? invoice : payments,
  };
  cachedFor = fingerprint;
  return cached;
}

/**
 * The default window for one source: `{from, to}` as `YYYY-MM-DD`, or both empty.
 *
 * `source` is `"invoice"` or `"payments"`. Anything else falls back to the later of the two, which
 * is the best a caller that does not know its own column can do.
 */
export async function defaultPeriod(fingerprint, source) {
  const dates = await latestDates(fingerprint);
  const latest = Object.prototype.hasOwnProperty.call(SOURCE_COLUMN, source) ? dates[source] : dates.all;
  if (!latest) return { from: "", to: "" };
  // `new Date("2026-04-11")` is UTC midnight, and `monthStart` reads UTC fields, so the month is the
  // one the date names rather than the host's local month.
  return { from: monthStart(new Date(latest)), to: latest };
}

/** Drop the cache. Called on a write, alongside the other modules' own invalidate. */
export function invalidate() {
  cached = null;
  cachedFor = null;
}

const stripTrailingSemicolon = (sql) => String(sql).trim().replace(/;\s*$/, "");