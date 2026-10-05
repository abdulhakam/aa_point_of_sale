/**
 * Headless runner for the `import-from-v1` plugin.
 *
 * Runs the plugin's **own** code — it extracts the inline script from
 * `app/plugins/import-from-v1/index.html` and evaluates it against a minimal DOM stub, then calls
 * the `window.__mig.run()` entry point the page itself exposes. Nothing about the import is
 * reimplemented here, so the headless path cannot drift from the browser path.
 *
 *   node tools/import-from-v1.mjs --pb http://127.0.0.1:8090 --tb http://127.0.0.1:4000 \
 *     --pb-identity <superuser> --pb-password <password> --tb-identity admin@localhost \
 *     --tb-password <local dev password>
 *
 * `--no-auth` runs the same import with **no PocketBase token at all**, for a server whose
 * collections are world-readable (`rules: ""`, which is how the legacy collections are defined). It
 * probes one collection first and refuses unless the probe answers 200, so the failure mode of a
 * locked-down PocketBase is a clear message here rather than a 403 partway through 60,000 records.
 * The import only ever *reads* from PocketBase — `count()` and `iterate()` are its whole surface —
 * so a token that changes nothing is not worth storing a superuser password to obtain.
 *
 * The PocketBase superuser is read from `PB_ADMIN_IDENTITY` / `PB_ADMIN_PASSWORD` or from explicit
 * flags, with **no default**: those credentials are recorded in the vault's local-only
 * `vault/credentials/` collection, which is git-ignored precisely so they are not published, and
 * baking them in here would defeat that. The TrailBase admin keeps its local-development default
 * because it is already committed in `trailbase/RUN.BAT`.
 *
 * Exits non-zero if the import reports errors, so an orchestrator can stop on a bad run.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : def;
};

const PLUGIN = arg(
  "--plugin",
  join(dirname(fileURLToPath(import.meta.url)), "..", "runtime", "app", "plugins", "import-from-v1", "index.html")
);

const CFG = {
  "pb-url": arg("--pb", "http://127.0.0.1:8090"),
  "pb-identity": arg("--pb-identity", process.env.PB_ADMIN_IDENTITY ?? ""),
  "pb-password": arg("--pb-password", process.env.PB_ADMIN_PASSWORD ?? ""),
  "tb-url": arg("--tb", "http://127.0.0.1:4000"),
  "tb-identity": arg("--tb-identity", "admin@localhost"),
  "tb-password": arg("--tb-password", "administrator-0ne"),
};

const NO_AUTH = process.argv.includes("--no-auth");

// Without a token, the plugin's `login()` throws and the whole run aborts. Probing first turns that
// into a message about the server's rules instead of a failed import, and it is the difference
// between learning the collections are locked at second 0 and at record 40,000.
async function probeWorldReadable() {
  const url = `${CFG["pb-url"]}/api/collections/invoices/records?page=1&perPage=1`;
  try {
    const res = await fetch(url);
    return res.status;
  } catch (e) {
    return `unreachable (${e.message})`;
  }
}

// The plugin's own `run()` validates these and flashes an error; this is a headless wrapper, so it
// fails with a clear message instead of waiting for that.
if (!NO_AUTH) {
  for (const required of ["pb-identity", "pb-password"]) {
    if (!CFG[required]) {
      console.error(
        `missing ${required}: pass --${required} or set ${required === "pb-identity" ? "PB_ADMIN_IDENTITY" : "PB_ADMIN_PASSWORD"}, or pass --no-auth if the collections are world-readable`
      );
      process.exit(2);
    }
  }
} else {
  const status = await probeWorldReadable();
  if (status !== 200) {
    console.error(
      `--no-auth: GET /api/collections/invoices/records answered ${status}, so this PocketBase does not serve its records unauthenticated. Re-run with --pb-identity/--pb-password.`
    );
    process.exit(2);
  }
  console.log("no-auth: the server serves records without a token; importing without logging in");
}

/* --------------------------------------------------------------- DOM stub */

// Only the surface the plugin touches is implemented: `value`/`checked` on the form inputs,
// `textContent`/`className`/`hidden`/`disabled` on the display nodes, `style.width`, a `parentNode`
// that accepts `setAttribute`, and `appendChild`. Anything else it reaches for is a stub bug and
// should fail loudly rather than silently no-op.
function makeElement(id) {
  const el = {
    id,
    value: CFG[id] ?? "",
    checked: id === "opt-wipe" ? process.argv.includes("--wipe") : id === "opt-dry" ? process.argv.includes("--dry") : false,
    hidden: false,
    disabled: false,
    className: "",
    textContent: "",
    style: { width: "" },
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
  };
  el.parentNode = { setAttribute() {} };
  return el;
}

const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  createElement(tag) {
    return makeElement(`<${tag}>`);
  },
};

const sandbox = {
  document,
  window: {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch,
  console,
  URL,
  URLSearchParams,
  Math,
  JSON,
  Date,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  Promise,
  Error,
  RegExp,
  isFinite,
  isNaN,
  parseInt,
  parseFloat,
  encodeURIComponent,
  decodeURIComponent,
  TextEncoder,
  TextDecoder,
  AbortController,
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

/* ------------------------------------------------------- extract and run */

const html = readFileSync(PLUGIN, "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const source = scripts.find((s) => s.includes("__mig"));
if (!source) {
  console.error(`No plugin script containing __mig found in ${PLUGIN}`);
  process.exit(1);
}

const context = vm.createContext(sandbox);
try {
  new vm.Script(source, { filename: "import-from-v1/index.html" }).runInContext(context, { timeout: 10_000 });
} catch (e) {
  console.error("Plugin script failed to evaluate:", e.message);
  process.exit(1);
}

const mig = sandbox.window.__mig;
if (!mig || typeof mig.run !== "function") {
  console.error("Plugin did not expose window.__mig.run");
  process.exit(1);
}

console.log(`importing ${CFG["pb-url"]} -> ${CFG["tb-url"]} (plugin code, headless)`);
const t0 = Date.now();

// `run()` catches its own errors into state, so it resolves even on failure; the state decides.
await mig.run();

const st = mig.state();
const secs = ((Date.now() - t0) / 1000).toFixed(1);

for (const entry of [...st.log].reverse()) console.log(`  [${entry.level}] ${entry.message}`);

if (st.summary) {
  const rows = Object.entries(st.summary).map(([name, c]) => ({
    collection: name,
    read: c.read,
    created: c.created,
    failed: c.failed,
    links: c.links,
  }));
  const total = rows.reduce((a, r) => a + r.created, 0);
  const failed = rows.reduce((a, r) => a + r.failed, 0);
  const read = rows.reduce((a, r) => a + r.read, 0);
  console.log(`\n${"collection".padEnd(30)} ${"read".padStart(7)} ${"created".padStart(8)} ${"failed".padStart(7)} ${"links".padStart(6)}`);
  for (const r of rows) {
    console.log(`${r.collection.padEnd(30)} ${String(r.read).padStart(7)} ${String(r.created).padStart(8)} ${String(r.failed).padStart(7)} ${String(r.links).padStart(6)}`);
  }
  console.log(`${"TOTAL".padEnd(30)} ${String(read).padStart(7)} ${String(total).padStart(8)} ${String(failed).padStart(7)}`);
  console.log(`\nstatus=${st.status}  phase=${st.phase}  ${secs}s  (${(total / Number(secs)).toFixed(0)} rec/s)`);
  process.exit(failed || st.status !== "done" ? 1 : 0);
}

console.error(`\nimport ended without a summary: status=${st.status} ${st.message || ""}`);
process.exit(1);
