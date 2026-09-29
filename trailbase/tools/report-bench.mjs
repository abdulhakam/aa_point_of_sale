const BASE = "http://127.0.0.1:4000";

// Date range. Defaults to the wide window the owner asked for: it contains both the business dates
// and the import timestamps, so the guest and v1 return the same full dataset and the known
// `created`-is-import-time divergence cannot skew a comparison (see guest-depot-created-is-import-time).
const FROM = process.env.RANGE_FROM || "2024-01-01";
const TO = process.env.RANGE_TO || new Date().toISOString().slice(0, 10);

const REPORTS = [
  "stockreport", "difference", "dailysale", "salesreport",
  "payments", "itemsales", "profit", "paymentsbycompany",
  "ledgers/area", "ledgers/general", "ledgers/booker",
  "ledgers/party", "outstanding", "productsale",
];

const cookie = process.argv[2];
if (!cookie) {
  console.error("usage: node report-bench.mjs 'auth_token=<jwt>'");
  process.exit(1);
}

async function timed(path) {
  const t0 = performance.now();
  let res, body = "";
  try {
    res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
    body = await res.text();
  } catch (e) {
    return { status: "ERR", ms: Math.round(performance.now() - t0), bytes: 0, note: e.message };
  }
  const ms = Math.round(performance.now() - t0);
  const bytes = Buffer.byteLength(body);
  let note = "";
  const noData = /No data/i.test(body);
  if (res.status === 303) note = "redirect(login?)";
  else if (res.status === 500) note = "deadline/500";
  else if (res.status !== 200) note = body.slice(0, 60);
  else if (noData) note = "NO DATA";
  return { status: res.status, ms, bytes, note, body };
}

const rows = [];
const qs = `?from=${FROM}&to=${TO}`;
console.log(`range ${FROM} .. ${TO}\n`);
for (const r of REPORTS) {
  const cold = await timed(`/reports/${r}${qs}`);
  const warm = await timed(`/reports/${r}${qs}`);
  // Count rendered body rows for a parity/row-count reference.
  const trs = (cold.body.match(/<tr/g) || []).length;
  rows.push({ report: r, coldMs: cold.ms, warmMs: warm.ms, status: cold.status, warmStatus: warm.status, bytes: cold.bytes, trs, note: cold.note || warm.note });
  process.stdout.write(
    `${r.padEnd(20)} cold ${String(cold.ms).padStart(7)}ms ${String(cold.status).padEnd(4)}  warm ${String(warm.ms).padStart(7)}ms ${String(warm.status).padEnd(4)}  ` +
    `${(cold.bytes / 1024).toFixed(0).padStart(6)} KB  rows ${String(trs).padStart(5)}${cold.note ? "  " + cold.note : ""}\n`
  );
}

const cliff = rows.filter((r) => r.status === 500 || r.coldMs >= 20000);
console.log(`\n${rows.length} reports, ${cliff.length} at/near the 20s deadline${cliff.length ? ": " + cliff.map((c) => c.report).join(", ") : ""}`);
