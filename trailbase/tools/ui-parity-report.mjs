/**
 * The discrepancy report: compare the two systems' structure captures screen by screen.
 *
 *   node trailbase/tools/ui-parity-report.mjs [--capture DIR] [--json out.json] [--screen NAME]
 *
 * Reads `<capture>/guest/<name>.structure.json` and `<capture>/legacy/<name>.structure.json` and reports,
 * per screen, what one side has and the other does not: tile labels, headings, buttons, table headers,
 * form labels, input names, and the handful of computed metrics that decide whether two screens *look*
 * alike (fonts, link colour, header transform, cell borders).
 *
 * ⚠️ **A difference here is a candidate, not a verdict.** The two apps are different codebases, so the
 * same control can legitimately carry a different word, and a missing item may be present under another
 * label. What this tool is good for is *finding* the places to look — a screen where one side has 11
 * tiles and the other has 4 is a finding; "Items" versus "Item" is a question. Every difference is
 * therefore printed with both sides' values and the screen it was found on, and the judgement is left
 * explicit — [[settle-structural-claims-with-the-owning-artifact]].
 */
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const ROOT = arg("--capture", join(HERE, "..", "..", "vault", "attachments", "ui-capture"));
const JSON_OUT = arg("--json", "");
const ONLY = arg("--screen", "");

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
/** Compare as SETS of normalised strings, so order is reported separately from membership. */
const setOf = (list) => new Set((list ?? []).map(norm).filter(Boolean));
const METRICS = ["bodyFont", "bodySize", "bodyBg", "linkColor", "buttonBg", "thTransform", "thBorder", "tdBorder"];

function load(system, name) {
  const p = join(ROOT, system, `${name}.structure.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

const stems = (system) =>
  existsSync(join(ROOT, system))
    ? readdirSync(join(ROOT, system)).filter((f) => f.endsWith(".structure.json")).map((f) => f.replace(".structure.json", ""))
    : [];

const names = [...new Set([...stems("guest"), ...stems("legacy")])].sort();

const report = [];
for (const name of names) {
  if (ONLY && !name.includes(ONLY)) continue;
  const g = load("guest", name);
  const l = load("legacy", name);
  if (!g && !l) continue;
  if (!g || !l) {
    report.push({ screen: name, kind: "one-sided", detail: !g ? "guest capture missing" : "legacy capture missing" });
    console.log(`\n${name}\n  ONE-SIDED: ${!g ? "no guest capture" : "no legacy capture"}`);
    continue;
  }

  const rows = [];
  // ⚠️ The two labels are the ones that decide whether a line is read the right way round, so they are
  // derived from one helper rather than written twice. `onlyIn(want, have)` = present in `want`, absent
  // from `have` — so "only guest" is what the GUEST has and the legacy does not.
  const onlyIn = (want, have) => [...want].filter((x) => !have.has(x));
  const add = (field, gList, lList, ordered) => {
    const gs = setOf(gList), ls = setOf(lList);
    const onlyGuest = onlyIn(gs, ls);
    const onlyLegacy = onlyIn(ls, gs);
    const gOrder = (gList ?? []).map(norm), lOrder = (lList ?? []).map(norm);
    const sameOrder = !ordered || gOrder.join("|") === lOrder.join("|");
    if (onlyGuest.length || onlyLegacy.length || !sameOrder) {
      rows.push({ field, onlyGuest, onlyLegacy, sameOrder, guestCount: gs.size, legacyCount: ls.size });
    }
  };

  add("tiles", g.tiles, l.tiles, true);
  add("headings", g.headings, l.headings, false);
  add("buttons", g.buttons, l.buttons, false);
  add("tableHeaders", g.tableHeaders, l.tableHeaders, true);
  add("formLabels", g.formLabels, l.formLabels, true);
  add("inputs", g.inputs, l.inputs, false);

  const metrics = {};
  for (const k of METRICS) {
    const a = g.metrics?.[k], b = l.metrics?.[k];
    if (a !== b) metrics[k] = { guest: a ?? null, legacy: b ?? null };
  }
  const rowsDiff = (g.rowCount ?? 0) - (l.rowCount ?? 0);
  if (Math.abs(rowsDiff) > 2) rows.push({ field: "rowCount", guest: g.rowCount, legacy: l.rowCount });

  report.push({ screen: name, rows, metrics, guestUrl: g.url, legacyUrl: l.url });

  const total = rows.length + Object.keys(metrics).length;
  console.log(`\n${name}   ${total === 0 ? "no differences" : `${total} difference group(s)`}`);
  for (const r of rows) {
    if (r.field === "rowCount") { console.log(`  rows: guest ${r.guest} vs legacy ${r.legacy}`); continue; }
    console.log(`  ${r.field}: guest ${r.guestCount} / legacy ${r.legacyCount}${r.sameOrder ? "" : "  (ORDER DIFFERS)"}`);
    if (r.onlyGuest.length) console.log(`      only guest : ${r.onlyGuest.slice(0, 8).join(" | ")}`);
    if (r.onlyLegacy.length) console.log(`      only legacy: ${r.onlyLegacy.slice(0, 8).join(" | ")}`);
  }
  for (const [k, v] of Object.entries(metrics)) {
    console.log(`  metric ${k}: guest "${v.guest}"  legacy "${v.legacy}"`);
  }
}

const screens = report.filter((r) => r.rows?.length || Object.keys(r.metrics ?? {}).length || r.kind);
console.log(`\n== ${report.length} screens compared, ${screens.length} with at least one difference ==`);
if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify(report, null, 2) + "\n"); console.log(`wrote ${JSON_OUT}`); }
