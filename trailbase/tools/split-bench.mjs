/**
 * Component-split A/B: in-process (composed) vs separate wasm component, on identical data.
 *
 * Answers one question: what does it cost to run SQL in a separate TrailBase component and hand
 * the rows over by name (KV key) instead of rendering straight from the SQL result?
 *
 *   arm=inline     main component runs the query, builds rows in QuickJS, renders minijinja
 *   arm=component  main component GETs /rpc/payload on the separate `sql.wasm` component, which
 *                  runs the query and stores the rows in the shared KV store, then the main
 *                  component reads them back by key and renders the same template
 *
 * Both arms must produce byte-identical HTML — that equality is asserted every run, because a
 * timing comparison between two arms that compute different numbers is worthless.
 *
 * Arms are interleaved, not run in blocks, so machine drift hits both equally.
 *
 *   node tools/split-bench.mjs [--reps 5] [--limits 500,2000,5000,10000] [--base URL] [--raw]
 *
 * `--raw` prints every individual sample, not just the median. Medians hide drift and
 * contamination; the raw series is what shows whether later runs are slower than earlier ones.
 */

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};

const RAW = process.argv.includes("--raw");
// NOTE: there is no cold mode. It was implemented as `PRAGMA cache_size`/`shrink_memory`, which
// TrailBase's DB bridge rejects outright, so it was a silent no-op that produced published
// "cold" numbers which were in fact warm (see issues/trailbase-guest-db-bridge-rejects-pragmas).
// A genuine cold measurement needs a fresh process per sample and is not implemented.
const COLD = false;
const COLDQ = "";

const BASE = arg("--base", "http://127.0.0.1:4000");
const REPS = Number(arg("--reps", 5));
const LIMITS = arg("--limits", "500,2000,5000,10000")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => n > 0);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const p90 = (xs) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * 0.9))];

async function fetchHtml(arm, limit) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}/bench/payload?arm=${arm}&limit=${limit}${COLDQ}`, { redirect: "manual" });
  const body = await res.text();
  return { status: res.status, ms: performance.now() - t0, body };
}

async function fetchTiming(arm, limit) {
  const res = await fetch(`${BASE}/bench/payload?arm=${arm}&limit=${limit}&format=json${COLDQ}`, { redirect: "manual" });
  return { status: res.status, data: await res.json() };
}

let failures = 0;
const fail = (m) => {
  failures++;
  console.log(`  !! ${m}`);
};

/* ------------------------------------------------------------ all-reports sweep */

// Measures acquiring each report's base-table rows, inline vs via the `sql` component.
//
// Equality gate is the acquired ROW COUNT per report, not the HTML: unlike the payload bench the two
// arms do not produce identical values, because the inline arm runs the app's `readTable`
// (relation ids as url-safe base64, booleans as 0/1) while the component returns raw column values.
// So this is an acquisition-cost comparison, not a correctness comparison.
// Three arms, because two of them answer different questions:
//   inline     the app's own readTable — column lookup, select, AND per-row normalisation
//   raw        identical work to the component (select all, no normalisation) — the FAIR comparison
//   component  the rows acquired by the separate `sql` component and handed over by KV key
// Comparing `component` against `inline` credits the split with normalisation it does not perform,
// so the headline number is `component` vs `raw`; `component` vs `inline` is reported as the
// end-to-end acquisition comparison.
async function sweepArm(key, arm) {
  const res = await fetch(`${BASE}/bench/report?key=${encodeURIComponent(key)}&arm=${arm}`);
  return res.json();
}

async function sweep() {
  const keys = (await (await fetch(`${BASE}/bench/reportkeys`)).json()).keys;
  console.log(`reports: ${keys.join(", ")}\n`);
  const out = [];
  const ARMS = ["inline", "raw", "component"];

  for (const key of keys) {
    const samples = { inline: [], raw: [], component: [] };
    const acq = { inline: [], raw: [], component: [] };
    const hand = [];
    let rows = {};
    let tables = [];

    for (let i = 0; i < REPS; i++) {
      for (const arm of ARMS) {
        const d = await sweepArm(key, arm);
        if (d.error) {
          fail(`${key} ${arm}: ${d.error}`);
          continue;
        }
        samples[arm].push(d.totalMs);
        acq[arm].push(d.acquireMs);
        if (arm === "component") hand.push(d.handoffMs);
        rows[arm] = d.rows;
        tables = d.tables || tables;
      }
    }

    const same = rows.inline === rows.raw && rows.raw === rows.component;
    if (!same) fail(`${key}: row counts differ ${JSON.stringify(rows)}`);

    const it = median(samples.inline);
    const rt = median(samples.raw);
    const ct = median(samples.component);
    const fair = rt === 0 ? 0 : ((ct - rt) / rt) * 100;
    const e2e = it === 0 ? 0 : ((ct - it) / it) * 100;
    out.push({ key, it, rt, ct, fair, e2e, tables: tables.length, rows: rows.inline });

    console.log(
      `${key.padEnd(20)} rows ${String(rows.inline).padStart(6)} tbl ${String(tables.length).padStart(2)}  ` +
        `inline ${String(it).padStart(6)}  raw ${String(rt).padStart(6)}  component ${String(ct).padStart(6)}ms  ` +
        `fair ${fair >= 0 ? "+" : ""}${fair.toFixed(1)}%  e2e ${e2e >= 0 ? "+" : ""}${e2e.toFixed(1)}%` +
        `  (acq raw ${String(median(acq.raw)).padStart(5)} vs comp ${String(median(acq.component)).padStart(5)}` +
        ` + hnd ${String(median(hand)).padStart(5)})`
    );
  }

  const summaries = [
    ["fair (component vs raw)", out.map((r) => r.fair)],
    ["end-to-end (component vs inline)", out.map((r) => r.e2e)],
  ];
  console.log(`\n${out.length} reports · row counts equal: ${failures === 0 ? "yes" : "NO"}`);
  for (const [label, ds] of summaries) {
    const sorted = [...ds].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const med = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const worse = ds.filter((d) => d > 0).length;
    console.log(
      `${label.padEnd(36)} median ${med >= 0 ? "+" : ""}${med.toFixed(1)}%   range ${sorted[0].toFixed(1)}% .. ${sorted[sorted.length - 1].toFixed(1)}%   reports slower than inline-packaging: ${worse}/${ds.length}`
    );
  }
  const byFair = [...out].sort((a, b) => b.fair - a.fair)[0];
  console.log(`worst for the split (fair): ${byFair.key} ${byFair.fair >= 0 ? "+" : ""}${byFair.fair.toFixed(1)}%`);
  if (failures) process.exit(1);
}

if (process.argv.includes("--reports")) {
  console.log(`component-split A/B — all reports  base=${BASE}  reps=${REPS}  cold=unavailable\n`);
  await sweep();
} else {

console.log(`component-split A/B  base=${BASE}  reps=${REPS}  limits=${LIMITS.join(",")}  cold=unavailable\n`);

for (const limit of LIMITS) {
  // Correctness gate first: the two arms must be the same computation.
  const [a, b] = [await fetchHtml("inline", limit), await fetchHtml("component", limit)];
  if (a.status !== 200 || b.status !== 200) {
    fail(`limit=${limit} status inline=${a.status} component=${b.status}`);
    continue;
  }
  if (a.body !== b.body) {
    fail(`limit=${limit} HTML DIFFERS (inline ${a.body.length}B vs component ${b.body.length}B)`);
  }

  const inline = { total: [], acquire: [], render: [] };
  const comp = { total: [], acquire: [], handoff: [], render: [] };
  const inner = { inlineQ: [], componentQ: [], componentW: [] };

  for (let i = 0; i < REPS; i++) {
    // Interleaved, so drift and the shared page cache hit both arms equally.
    const ti = await fetchTiming("inline", limit);
    const tc = await fetchTiming("component", limit);
    if (RAW) {
      console.log(
        `     rep ${String(i + 1).padStart(2)}  inline ${String(ti.data?.totalMs ?? "-").padStart(6)}ms` +
          ` (acq ${String(ti.data?.acquireMs ?? "-").padStart(5)} rnd ${String(ti.data?.renderMs ?? "-").padStart(5)})` +
          `   component ${String(tc.data?.totalMs ?? "-").padStart(6)}ms` +
          ` (acq ${String(tc.data?.acquireMs ?? "-").padStart(5)} hnd ${String(tc.data?.handoffMs ?? "-").padStart(5)}` +
          ` rnd ${String(tc.data?.renderMs ?? "-").padStart(5)}  sql ${String(tc.data?.sqlComponent?.queryMs ?? "-").padStart(4)})`
      );
    }
    if (ti.status === 200) {
      inline.total.push(ti.data.totalMs);
      inline.acquire.push(ti.data.acquireMs);
      inline.render.push(ti.data.renderMs);
    }
    if (tc.status === 200) {
      comp.total.push(tc.data.totalMs);
      comp.acquire.push(tc.data.acquireMs);
      comp.handoff.push(tc.data.handoffMs);
      comp.render.push(tc.data.renderMs);
      if (tc.data.sqlComponent) {
        inner.inlineQ.push(ti.data?.acquireMs ?? 0);
        inner.componentQ.push(tc.data.sqlComponent.queryMs);
        inner.componentW.push(tc.data.sqlComponent.writeMs);
      }
    }
  }

  const it = median(inline.total);
  const ct = median(comp.total);
  const delta = it === 0 ? 0 : ((ct - it) / it) * 100;
  const mb = (a.body.length / 1024 / 1024).toFixed(2);

  console.log(
    `limit=${String(limit).padStart(6)}  html ${mb}MB  identical=${a.body === b.body ? "yes" : "NO"}`
  );
  console.log(
    `   inline    total ${String(it).padStart(6)}ms  p90 ${String(p90(inline.total)).padStart(6)}ms` +
      `   [acquire ${String(median(inline.acquire)).padStart(5)}ms  render ${String(median(inline.render)).padStart(5)}ms]`
  );
  console.log(
    `   component total ${String(ct).padStart(6)}ms  p90 ${String(p90(comp.total)).padStart(6)}ms` +
      `   [acquire ${String(median(comp.acquire)).padStart(5)}ms  handoff ${String(median(comp.handoff)).padStart(5)}ms` +
      `   render ${String(median(comp.render)).padStart(5)}ms]`
  );
  console.log(
    `   overhead: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%  (separate component minus in-process)`
  );
  if (inner.componentQ.length) {
    console.log(
      `   inside sql.wasm: query ${String(median(inner.componentQ)).padStart(4)}ms + ` +
        `serialise+store ${String(median(inner.componentW)).padStart(4)}ms` +
        `  =>  the HTTP hop + KV read is what costs, not the query`
    );
  }
  console.log();
}

if (failures) {
  console.log(`${failures} failure(s) — the timings above are not comparable.`);
  process.exit(1);
}
console.log("all arms byte-identical; timings comparable.");
}
