// The app context: the module bundle every handler needs, plus the business identity.
//
// WHY THIS IS A MODULE. It used to be `app()` inside `ahscripts/routes/_app/route.ts`, the single
// dispatcher. That made the bundle unreachable from anywhere else: a route FOLDER never calls the
// dispatcher, so it could not build `__AA_APP__`. Route folders are how tb-0030 retires the
// dispatcher, so the bundle had to become loadable — by the dispatcher and by a route folder alike —
// through the host's `__AA_LOAD__`, exactly like every other `app/lib` module. This is the
// "shared-context extraction" the note `serving-a-route-from-a-route-folder` names as the one piece
// still missing.
//
// It closes over nothing from the dispatcher: `loadModule` is the host global `__AA_LOAD__` (present
// in every route, injected by `ROUTE_PRELUDE`), and the business defaults live here so route.ts no
// longer needs its own copy.
//
// A route folder calls `(await __AA_LOAD__("/app/lib/context.js")).app()`.

const loadModule = globalThis.__AA_LOAD__;

/** Business identity defaults — the legacy values (frontend/.env.local), so a direct shift matches. */
export const DEFAULT_BUSINESS = {
  name: "SAMPLE TRADERS",
  address: "123 Sample Street, Sample City",
  phone: "000-0000000",
};

/** The configured business identity, or the legacy defaults. Set once by `app()`. */
export function business() {
  return globalThis.__AA_BUSINESS__ || DEFAULT_BUSINESS;
}

/** Build (once) and return the module bundle every handler uses. */
export async function app() {
  const g = globalThis;
  // Optional per-deployment business identity; defaults to the legacy values in DEFAULT_BUSINESS.
  if (!g.__AA_BUSINESS__) {
    g.__AA_BUSINESS__ = DEFAULT_BUSINESS;
    try {
      const raw = await fs.readFile("/app/config/business.json");
      const cfg = JSON.parse(raw);
      g.__AA_BUSINESS__ = {
        name: String(cfg.name || DEFAULT_BUSINESS.name),
        address: String(cfg.address || DEFAULT_BUSINESS.address),
        phone: String(cfg.phone || DEFAULT_BUSINESS.phone),
      };
    } catch (e) {
      // Optional file: absent or unreadable keeps the defaults.
    }
  }
  if (g.__AA_APP__) return g.__AA_APP__;
  const modules = {
    format: await loadModule("/app/compute/format.js"),
    ids: await loadModule("/app/compute/ids.js"),
    entities: await loadModule("/app/lib/entities.js"),
    // Populated from `/app/manifests/entities.json` by `app()` below, which is async. Kept a plain
    // object because `inventory.js` imports it synchronously.
    manifests: null,
    data: await loadModule("/app/lib/data.js"),
    pages: await loadModule("/app/lib/pages.js"),
    plugins: await loadModule("/app/lib/plugins.js"),
    management: await loadModule("/app/lib/management.js"),
    // A party or an item made from the screen that needed it — the invoice's own create affordance,
    // as the legacy invoice screen had. Called inside the invoice write and lock, never on its own.
    quickCreate: await loadModule("/app/lib/quick-create.js"),
    invoicing: await loadModule("/app/lib/invoicing.js"),
    lifecycle: await loadModule("/app/lib/invoice-lifecycle.js"),
    invoices: await loadModule("/app/lib/invoices.js"),
    expenses: await loadModule("/app/lib/expenses.js"),
    qtyAsText: (await loadModule("/app/lib/format-qty.js")).qtyAsText,
    payments: await loadModule("/app/lib/payments.js"),
    inventory: await loadModule("/app/lib/inventory.js"),
    // Path helpers, plus `runtimeRevision()` — a content hash of the app tree that the rendered-page
    // cache keys on, so a code change invalidates it and not only a data change.
    paths: await loadModule("/app/lib/paths.js"),
    // The reference lists, defined by `app/sql/refs.sql`. Step 1 of tb-0032.
    refs: await loadModule("/app/lib/refs.js"),
    // The data-derived default date window, defined by `app/sql/latest_business_date.sql`, so a
    // report opens on a month that has data rather than on the wall clock's current month.
    dates: await loadModule("/app/lib/dates.js"),
    service: await loadModule("/app/lib/reports.js"),
    // The report engine. Every report is SQL: the statements under
    // `app/reports/sql/reports/*.sql`, run through the spool. There is no JavaScript
    // implementation of any report left to fall back to.
    spooled: await loadModule("/app/lib/spoolreports.js"),
    // The two derived reads the app still needs, as SQL: the dashboard counts and the item rows behind
    // invoice entry and /inventory. These replaced the last live callers of the JavaScript view layer
    // (tb-0032 step 3), which now lives in `trailbase/tools/_src/legacy-views.js` as a verification fixture.
    baseviews: await loadModule("/app/lib/baseviews.js"),
    http: await loadModule("/app/lib/http.js"),
    renderClient: await loadModule("/app/lib/render-client.js"),
    reportPages: await loadModule("/app/lib/report-pages.js"),
    // The idioms every handler repeated: invalidate-on-commit, the refs snapshot, the page shell,
    // and the hex<->base64 pair. See app/lib/route-kit.js for why each exists.
    routeKit: await loadModule("/app/lib/route-kit.js"),
  };
  // The queue engine is a plain script so the scheduler's fresh runtime can load it too.
  if (!g.__AA_QUEUE__) {
    const source = await fs.readFile("/app/lib/queue.js");
    (0, eval)(source);
  }
  modules.jobs = g.__AA_QUEUE__;
  // Same reason: /ahscripts/init/invoice-doc.js reads this file in a fresh context at server start
  // and calls the same rebuild. One implementation of "rebuild", so a boot rebuild and a button
  // rebuild cannot drift apart.
  if (!g.__AA_INVDOC__) {
    const invoiceDocSource = await fs.readFile("/app/lib/invoice-doc.js");
    (0, eval)(invoiceDocSource);
  }
  modules.invoiceDoc = g.__AA_INVDOC__;
  // Manifests. The tables that used to be hand-written JavaScript — the entity definitions first — are
  // data now, in `/app/manifests/*.json`, read once here.
  //
  // `entities.install()` rather than `modules.entities.ENTITIES = …`, because `inventory.js` captured a
  // reference to `ENTITIES` when it was imported; reassigning the binding would leave it pointing at the
  // empty object, and `Object.assign` mutates what it already holds.
  modules.manifests = await loadModule("/app/manifests/index.js");
  // `loadAll()` rather than three reads, so a MISSING manifest fails at start-up with its name instead of
  // at the first request that happens to need it — which is the difference between a clear error and a
  // screen that renders empty.
  const manifests = await modules.manifests.loadAll();
  modules.entities.install(manifests.entities);
  // The schema contract: which tables exist, which columns are foreign keys, which are 0/1 booleans.
  //
  // `TABLES` is MUTATED (`length = 0; push(…)`) rather than reassigned, because `reports.js` captures a
  // reference to it by destructuring at import time. Reassigning the module-local binding would leave
  // `reports.js` holding an empty array and every fingerprint probe would silently cover zero tables —
  // which reads as "the data never changes" rather than as a bug.
  modules.data.install(manifests.schema);
  g.__AA_APP__ = modules;
  return modules;
}
