// Print real party and booker ids for driving the report filters from outside the guest.
//
//   node trailbase/tools/sample-filter-ids.mjs
//   $env:TB_PARTY=...; $env:TB_BOOKER=...; node trailbase/tools/check-report-pages.mjs
//
//   node trailbase/tools/sample-filter-ids.mjs | ForEach-Object { $k,$v = $_ -split '=',2; Set-Item -Path "env:$k" -Value $v }
//
// The reason this exists: an id is 16 bytes of BLOB, and the only way into a query string is
// base64url. Typing one by hand is how a check ends up filtering on a party that does not exist and
// reporting "zero rows" as though the report were broken. Every id in a report filter should come
// from here.
import { DatabaseSync } from "node:sqlite";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dbPath = process.env.DEPOT_DB || join(repo, "trailbase", "traildepot", "data", "main.db");
const db = new DatabaseSync(dbPath, { readOnly: true });
const b64 = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64url");

// The busiest value of each kind, so a correct filter leaves most of the report behind.
// `party` and `booker` are joined through the invoice, because a payment's booker lives on its
// invoice — "the busiest invoice" can be an invoice with no payments at all.
const PARTY = db.prepare(
  "SELECT party AS id FROM payments WHERE party IS NOT NULL GROUP BY party ORDER BY COUNT(*) DESC LIMIT 1",
).get();
const BOOKER = db.prepare(
  "SELECT i.booker AS id FROM payments p JOIN invoices i ON i.id = p.invoice WHERE i.booker IS NOT NULL GROUP BY i.booker ORDER BY COUNT(*) DESC LIMIT 1",
).get();

const out = [];
if (PARTY?.id != null) out.push(`TB_PARTY=${b64(PARTY.id)}`);
if (BOOKER?.id != null) out.push(`TB_BOOKER=${b64(BOOKER.id)}`);
// The single import date every `created` column shares, which is the only date range that returns
// the whole set for the reports that filter on `created` rather than `payment_date`.
const day = db.prepare("SELECT substr(MIN(created),1,10) d FROM payments").get();
if (day?.d) out.push(`TB_DAY=${day.d}`);

console.log(out.join("\n"));
if (out.length < 3) throw new Error("could not derive sample filter ids from the depot");
