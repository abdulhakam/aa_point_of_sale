// Guest HTTP/template helpers — `page`/`qs`/`qsb`,
// rendering through the host's Rust minijinja bridge (`render.html`).
//
// `page` is ASYNC because the renderer may not be this component. It routes through
// `render-client`, so whether a page is rendered in-process or by the separate `renderer.wasm`
// component is `/ahscripts/config/renderer.json` rather than a change to any call site — 25 of them
// (vault/decisions/rendering-is-a-component-behind-an-envelope.md).

// The context is handed to the renderer as a VALUE, not a string.
//
// The host's `render.html` / `render.spooled` take the context object directly and walk it in Rust
// (`ctx_json_value` -> `js_to_json`). Both call sites used to `JSON.stringify` it first, which meant
// serialising the whole context in QuickJS and re-parsing it on the other side — a full extra copy of
// the filters, options, applied labels and totals on every page render. The host still accepts a
// string, which is how the back-compat path in `ctx_json_value` stays honest, but nothing here uses it.
//
// The rows are already out of QuickJS by the time either of these runs: `pageSpooled` passes only the
// shell, the filters and the totals, and the host splices the row set in from the KV handle.

export async function page(req, shell, name, data) {
  return render.html(name, shellContext(shell, data));
}

/**
 * The same page, with row sets spliced in by the host instead of sitting in `data`.
 *
 * A report page's rows are 60k objects; putting them in `data` means building that object in
 * QuickJS, which is the cost the spool exists to remove. So `data` carries the shell, the filters
 * and the totals, and `spools` is a list of `{field, key}` the host splices into the same context
 * just before it renders.
 */
export async function pageSpooled(req, shell, name, data, spools) {
  return render.spooled(name, shellContext(shell, data), spools || []);
}

/** Everything the shell contributes to a page context, plus the caller's own data. */
function shellContext(shell, data) {
  return {
    appName: shell.appName,
    // Printed reports carry the legacy business header (PrintHead parity).
    businessName: shell.businessName ?? shell.appName,
    businessAddress: shell.businessAddress ?? "",
    businessPhone: shell.businessPhone ?? "",
    // Optional print logo URL; empty means nothing is drawn (see business.json).
    businessLogo: shell.businessLogo ?? "",
    user: shell.user ?? null,
    active: shell.active ?? "",
    title: shell.title ?? shell.appName,
    flash: shell.flash ?? null,
    nav: shell.nav ?? {},
    // The current data version, for the client's IndexedDB reference cache (refdb.js). Empty when a
    // page is rendered by a path that does not carry it, which makes the client sync rather than
    // trust a stale cache. See [[reference-lists-come-from-indexeddb]].
    refdbVersion: shell.refdbVersion ?? "",
    // Which paper this page prints on. A5 for an invoice or a voucher, A4 for a report, both
    // portrait by default (the operator chooses Landscape in the browser's print dialog),
    // and blank for everything else so the print media query does not apply a size to, say, the
    // dashboard. The stylesheet keys off this attribute rather than guessing from the route.
    paper: shell.paper ?? "",
    // See `isFragment`. When true, `layout.html.jinja` emits only the body block so htmx can swap it into
    // `#app-main` without re-rendering the app shell (topbar, nav, head, script tags).
    fragment: shell.fragment === true,
    ...(data || {}),
  };
}

/**
 * Is this request an htmx fragment request?
 *
 * `layout.html.jinja` renders the full document normally, and ONLY the body block (no doctype, head,
 * topbar, nav or script tags) when this is true. htmx's boosted navigation swaps that fragment into
 * `#app-main`, so the shell is rendered once and never re-rendered on a nav click.
 *
 * ⚠️ The host exposes a FIXED header allowlist (`tb-ah-run-js/src/lib.rs`): content-type, accept,
 * accept-encoding, if-none-match, cookie, host, referer, x-csrf-token, x-requested-with. htmx's own
 * `HX-Request` is NOT copied through, so the client also sends `X-Requested-With` — which IS in the
 * allowlist — via `hx-headers` on the layout's `<body>`. Both are accepted here: `HX-Request` in case
 * the allowlist grows to include it, `X-Requested-With` for today.
 *
 * An absent header means "full page", the safe default — a browser with no htmx, a direct GET, or a
 * plain XHR from `app.js` (which sends neither) all get the whole document exactly as before.
 */
export function isFragment(req) {
  const headers = (req && req.headers) || {};
  const hx = String(headers["hx-request"] ?? headers["HX-Request"] ?? "").toLowerCase() === "true";
  const xrw = String(headers["x-requested-with"] ?? headers["X-Requested-With"] ?? "");
  return hx || xrw.length > 0;
}

export function qs(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

export const qsb = (value) => ["on", "true", "1", "yes"].includes(String(qs(value)).toLowerCase());
