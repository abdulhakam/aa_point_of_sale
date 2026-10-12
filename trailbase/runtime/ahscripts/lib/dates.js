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

const DATES_SQL = "/ahscripts/sql/latest_business_date.sql";

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

/**
 * The legacy report's period line reads `11-Apr-2026` — day, three-letter month, four-digit year.
 * Measured off `vault/attachments/legacy-ui/09-reports-profit.png`, where the title row carries
 * "From: 11-Apr-2026 To: 28-Sep-2026" on the right.
 *
 * ⚠️ Deliberately NOT `toLocaleDateString`, whose output depends on the host's ICU data and locale —
 * the same build would print `Apr 11, 2026` or `11/04/2026` on another machine, and a date that changes
 * shape with the environment is not a date a shop can read a printout of. The month names are spelled
 * out here.
 *
 * The parts are taken as TEXT rather than parsed into a Date, so no timezone can shift the day — the
 * same reason the rest of this module works in UTC fields.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function legacyDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!m) return value ? String(value) : "";
  return `${m[3]}-${MONTHS[Number(m[2]) - 1] ?? m[2]}-${m[1]}`;
}

/**
 * The shop's wall clock is Pakistan Standard Time, UTC+05:00, with no daylight saving.
 *
 * The legacy print renders the invoice's `created` and the current time with the BROWSER's local
 * time — on the till that is PKT. The guest renders on the server, whose clock is UTC (a container),
 * so the offset is applied explicitly here instead of being left to the host's timezone: the same
 * document must print `3:48:33 PM` wherever the server runs.
 */
const SHOP_OFFSET_MINUTES = 5 * 60;

/** The UTC wall-clock fields of `value` shifted into shop time, or `null` when it does not parse. */
function shopParts(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(value ?? ""));
  if (!m) return null;
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)));
  const s = new Date(t.getTime() + SHOP_OFFSET_MINUTES * 60_000);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth(),
    d: s.getUTCDate(),
    hh: s.getUTCHours(),
    mm: s.getUTCMinutes(),
    ss: s.getUTCSeconds(),
  };
}

/** `2:33:45 PM` for a shop-time part set. */
function clockText(p) {
  const h = p.hh % 12 || 12;
  return `${h}:${String(p.mm).padStart(2, "0")}:${String(p.ss).padStart(2, "0")} ${p.hh >= 12 ? "PM" : "AM"}`;
}

/**
 * The invoice sheet's date, `Apr 11, 2026` (month name, day, year) — the legacy print header's shape,
 * not the report period line's `11-Apr-2026`. Same text-first rule and the same MONTHS table as
 * `legacyDate`, so the month names are spelled once.
 *
 * The value is a UTC timestamp (`created`); it is shifted into shop time first, so an invoice created
 * after 7pm PKT prints the shop's own day rather than the UTC day.
 */
export function printDate(value) {
  const p = shopParts(value);
  if (!p) return String(value ?? "").slice(0, 10);
  return `${MONTHS[p.m] ?? p.m + 1} ${p.d}, ${p.y}`;
}

/**
 * The invoice sheet's 12-hour time, `2:33:45 PM`. The legacy sheet sources this from the invoice's v1
 * `created`; every imported invoice carries the SAME `created` as v1 (verified 2026-10-09 across all
 * 8,927 shared invoices), so callers pass `created` and the time matches the legacy paper.
 */
export function printTime(value) {
  const p = shopParts(value);
  return p ? clockText(p) : "";
}

/**
 * The current shop time, for the sheet's `PRINT TIME:` block — `{date: "Oct 9, 2026", time: "11:15:59 AM"}`.
 * `at` overrides "now" for tests.
 */
export function shopNow(at) {
  const p = shopParts(new Date(at ? at : Date.now()).toISOString());
  return p ? { date: `${MONTHS[p.m] ?? p.m + 1} ${p.d}, ${p.y}`, time: clockText(p) } : { date: "", time: "" };
}