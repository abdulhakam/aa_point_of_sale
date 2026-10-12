// Static template-resolution checker for the tb-0043 layout.
//
// The renderer (tb-ah-run-js/src/render.rs) searches three roots in order and resolves every
// template name root-relative:
//   1. runtime/ahscripts/routes  (colocated route templates)
//   2. runtime/ahscripts/views   (shared layout.html.jinja + partials/*)
//   3. runtime/ahscripts/pages   (declarative page templates)
//
// This tool mirrors that resolution statically: it collects every template reference from route/lib
// code, every `template`/`view` in a page `meta.json`, and every `extends`/`include`/`import`/`from`
// directive inside the templates themselves, and asserts each one resolves. It cannot run the wasm,
// so it is the strongest check available without a rebuild + live server.
//
// Usage: node tools/template-check.mjs   (exit 1 on any unresolved reference)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const here = fileURLToPath(new URL(".", import.meta.url));
const RT = join(here, "..", "runtime", "ahscripts");
const ROOTS = [join(RT, "routes"), join(RT, "views"), join(RT, "pages")];
const ROOT_NAMES = ["routes", "views", "pages"];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const allFiles = ROOTS.flatMap((r) => walk(r, []));

/** Resolve a template name the way the Rust Loader does: first root that has the file. */
function resolveName(name) {
  const rel = String(name).replace(/\\/g, "/").replace(/^\/+/, "");
  for (let i = 0; i < ROOTS.length; i++) {
    const p = join(ROOTS[i], rel);
    if (existsSync(p) && statSync(p).isFile()) return ROOT_NAMES[i];
  }
  return null;
}

const misses = [];
const seen = new Set();
function check(name, where) {
  if (!name || name.includes("${")) return;
  const key = name + "|" + where;
  if (seen.has(key)) return;
  seen.add(key);
  const root = resolveName(name);
  if (!root) misses.push({ name, where });
}

// 1. Code references (route folders and lib).
const codeRe = [
  [/template:\s*["']([^"']+)["']/g, "template:"],
  [/render\.html\(\s*["']([^"']+)["']/g, "render.html"],
  [/benchRender\(\s*[^,]+,\s*["']([^"']+)["']/g, "benchRender"],
  [/\.page(?:Spooled)?\(\s*[^,]+,\s*[^,]*,\s*["']([^"']+)["']/g, "page"],
];
for (const f of allFiles) {
  if (!f.endsWith(".ts") && !f.endsWith(".js")) continue;
  const src = readFileSync(f, "utf8");
  const rel = relative(RT, f);
  for (const [re, kind] of codeRe) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) check(m[1], `${kind} @ ${rel}`);
  }
}

// 2. Declarative pages: meta.json `template` (slug-relative) and `view` (root-relative).
const pagesRoot = join(RT, "pages");
for (const f of walk(pagesRoot, [])) {
  if (!f.endsWith("meta.json")) continue;
  let meta;
  try { meta = JSON.parse(readFileSync(f, "utf8")); } catch (e) { misses.push({ name: f, where: "meta.json is not valid JSON" }); continue; }
  const slug = relative(pagesRoot, f).replace(/\\/g, "/").replace(/\/meta\.json$/, "");
  const tpl = typeof meta.template === "string" && meta.template ? meta.template : "page.html.jinja";
  check(`${slug}/${tpl}`, `meta @ ${slug}`);
  if (typeof meta.view === "string" && meta.view) check(meta.view, `meta.view @ ${slug}`);
}

// 3. Inheritance/directives inside every template.
const dirRe = /\{%-?\s*(extends|include|import|from)\s+["']([^"']+)["']/g;
for (const f of allFiles) {
  if (!f.endsWith(".html.jinja")) continue;
  const src = readFileSync(f, "utf8");
  const rel = relative(RT, f);
  dirRe.lastIndex = 0;
  let m;
  while ((m = dirRe.exec(src))) check(m[2], `${m[1]} @ ${rel}`);
}

const templateCount = allFiles.filter((f) => f.endsWith(".html.jinja")).length;
if (misses.length) {
  console.error(`UNRESOLVED (${misses.length}):`);
  for (const x of misses) console.error(`  ${x.name}    [${x.where}]`);
  process.exit(1);
}
console.log(`template-check: OK — ${templateCount} templates, ${seen.size} references resolve across [${ROOT_NAMES.join(", ")}]`);
