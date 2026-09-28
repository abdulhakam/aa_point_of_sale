const BASE = "http://127.0.0.1:4000";
const REPORTS = [
  "stockreport", "difference", "dailysale", "salesreport",
  "payments", "itemsales", "profit", "paymentsbycompany",
  "ledgers/area", "ledgers/general", "ledgers/booker",
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
  if (res.status === 303) note = "redirect(login?)";
  else if (res.status === 500) note = body.slice(0, 60);
  else if (res.status !== 200) note = body.slice(0, 60);
  return { status: res.status, ms, bytes, note };
}

const rows = [];
for (const r of REPORTS) {
  const cold = await timed(`/reports/${r}`);
  const warm = await timed(`/reports/${r}`);
  rows.push({ report: r, coldMs: cold.ms, warmMs: warm.ms, status: cold.status, warmStatus: warm.status, bytes: cold.bytes, note: cold.note || warm.note });
  process.stdout.write(
    `${r.padEnd(20)} cold ${String(cold.ms).padStart(7)}ms ${String(cold.status).padEnd(4)}  warm ${String(warm.ms).padStart(7)}ms ${String(warm.status).padEnd(4)}  ${(cold.bytes / 1024).toFixed(0).padStart(6)} KB${cold.note ? "  " + cold.note : ""}\n`
  );
}

const cliff = rows.filter((r) => r.status === 500 || r.coldMs >= 20000);
console.log(`\n${rows.length} reports, ${cliff.length} at/near the 20s deadline${cliff.length ? ": " + cliff.map((c) => c.report).join(", ") : ""}`);
