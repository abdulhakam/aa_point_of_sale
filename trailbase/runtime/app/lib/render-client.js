// The renderer client: the app host's way of asking for a page, whichever renderer is behind it.
//
// Two implementations, one call shape:
//
//   "inproc"    render.html(name, ctx)  — minijinja inside this component, a function call
//   "component" POST /render            — a separate wasm component, an HTTP hop
//
// The envelope is defined in vault/decisions/rendering-is-a-component-behind-an-envelope.md. This
// module exists so that swapping `inproc` for `component` — or `component` for a renderer written
// in another language entirely — is a CONFIGURATION VALUE and not a rewrite of every call site.
//
// Which one is in force is read from `/app/config/renderer.json`, so a deployment can be changed
// without editing runtime code:
//
//     { "renderer": "inproc" }              // default
//     { "renderer": "component", "path": "/render" }
//
// `inproc` remains the default until the split is measured. The measured cost of a component
// boundary for ACQUISITION was +71% (vault/decisions/component-split-and-sql-materialised-tables),
// but that measurement pushed 60k rows through the hop as a value. Here the context can be passed
// as an ADDRESS, so the hop carries a few hundred bytes. Which is faster is an experiment, not an
// assumption — `benchRender` below is that experiment.

// It depends on NOTHING. That is deliberate: this module sits on the path of every single page
// render, and an import here becomes part of every request's module graph — a wrong path fails at
// `loadModule` time and takes every page with it.

const DEFAULT_CONFIG = { renderer: "inproc", path: "/render" };

let cachedConfig = null;

async function config() {
  if (cachedConfig) return cachedConfig;
  cachedConfig = DEFAULT_CONFIG;
  // A missing or unreadable file keeps the in-process default, which is the one that cannot be
  // broken by a component failing to load.
  const raw = await fs.readFile("/app/config/renderer.json").catch(() => "");
  if (raw) {
    try {
      cachedConfig = { ...DEFAULT_CONFIG, ...(JSON.parse(String(raw)) || {}) };
    } catch (e) {
      cachedConfig = DEFAULT_CONFIG;
    }
  }
  return cachedConfig;
}

/** The origin this component should call its own server on, derived from the request. */
function originOf(req) {
  const m = /^https?:\/\/[^/]+/.exec(String(req?.url || ""));
  return m ? m[0] : "";
}

/**
 * Render a named template with an inline context.
 *
 * The in-process path is a direct bridge call. The component path posts the same envelope the
 * renderer component documents, and unwraps it: a `status` other than "ok" is an exception here, so
 * a caller never has to branch on which renderer answered.
 */
export async function renderTemplate(req, name, ctx) {
  const cfg = await config();
  if (cfg.renderer !== "component") {
    // The bridge takes strings. `ctx` is already a JSON string from `page`, but a caller could pass
    // an object, and `render.html` then fails with an opaque conversion error from Rust.
    const text = typeof ctx === "string" ? ctx : JSON.stringify(ctx ?? {});
    return render.html(String(name), text);
  }
  const requestId = "r-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  const text = typeof ctx === "string" ? ctx : JSON.stringify(ctx ?? {});

  // The address form. The payload goes to the shared KV store and the envelope carries only the key,
  // so the hop's cost stops depending on the size of the document. This is the whole argument for
  // the split, so it is opt-in per deployment rather than assumed — `benchRender` measures both.
  let context = ctx;
  if (cfg.address === true) {
    const key = "render-ctx:" + requestId;
    try {
      await kv.set(key, text);
      context = { address: { store: "kv", key, bytes: text.length, format: "json" } };
    } catch (e) {
      context = ctx; // fall back to inline rather than fail the page
    }
  }

  const envelope = {
    aa_render: 1,
    request_id: requestId,
    template: { name },
    context,
  };
  const res = await http.request({
    method: "POST",
    url: originOf(req) + (cfg.path || "/render"),
    headers: { "content-type": "application/json" },
    body: JSON.stringify(envelope),
  });
  if (Number(res?.status) !== 200) {
    throw new Error(`renderer component answered ${res?.status}: ${String(res?.body ?? "").slice(0, 300)}`);
  }
  let parsed = null;
  try {
    parsed = JSON.parse(String(res.body));
  } catch (e) {
    throw new Error(`renderer component returned a non-envelope body: ${String(res.body).slice(0, 200)}`);
  }
  if (parsed.aa_render !== 1) {
    throw new Error(`renderer component speaks envelope ${parsed.aa_render}, this caller speaks 1`);
  }
  if (parsed.status !== "ok") {
    const d = parsed.diagnostics || {};
    throw new Error(`render refused (${parsed.status}): ${parsed.error} [renderer=${d.renderer} template=${d.template ?? "?"}]`);
  }
  return parsed.body;
}

/**
 * Render the same template both ways and report the difference. This is the measurement the
 * decision note names as the deliverable — the split's cost is not knowable from the acquisition
 * benchmark, because this path passes an address rather than a value.
 */
export async function benchRender(req, name, ctx, rounds = 5) {
  const cfg = await config();
  const runs = { inproc: [], component: [], componentAddress: [] };
  const text = typeof ctx === "string" ? ctx : JSON.stringify(ctx ?? {});

  // Warm once so neither measurement pays a first-call cost the other avoids.
  try {
    render.html(name, text);
  } catch (e) {
    return { error: "in-process render failed: " + e };
  }

  const call = async (useAddress) => {
    // The address flag is per call, so the two component arms are measured from one module.
    cachedConfig = { ...(cfg || DEFAULT_CONFIG), address: useAddress };
    return renderTemplate(req, name, text);
  };

  for (let i = 0; i < rounds; i++) {
    let t0 = Date.now();
    render.html(name, text);
    runs.inproc.push(Date.now() - t0);

    if (cfg.renderer === "component") {
      t0 = Date.now();
      try {
        await call(false);
      } catch (e) {
        return { error: "component render failed: " + e };
      }
      runs.component.push(Date.now() - t0);

      t0 = Date.now();
      try {
        await call(true);
      } catch (e) {
        return { error: "component render (address) failed: " + e };
      }
      runs.componentAddress.push(Date.now() - t0);
    }
  }
  cachedConfig = cfg;

  const median = (a) => {
    if (!a.length) return null;
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };
  const pct = (v) => (out.inprocMs > 0 ? Math.round((v / out.inprocMs - 1) * 100) : null);
  const out = { template: name, rounds, contextBytes: text.length, inprocMs: median(runs.inproc) };
  out.componentMs = median(runs.component);
  out.componentAddressMs = median(runs.componentAddress);
  if (out.componentMs !== null) {
    out.inlineOverheadPct = pct(out.componentMs);
    out.inlineOverheadMs = out.componentMs - out.inprocMs;
  }
  if (out.componentAddressMs !== null) {
    out.addressOverheadPct = pct(out.componentAddressMs);
    out.addressOverheadMs = out.componentAddressMs - out.inprocMs;
  }
  if (out.componentMs === null) out.note = "renderer.json is not set to 'component'; nothing to compare";
  return out;
}

/** What the app host believes it is using, for a status screen. */
export async function rendererStatus(req) {
  const cfg = await config();
  const out = {
    configured: cfg.renderer,
    path: cfg.path || "/render",
    componentReachable: null,
    detail: "",
    probe: null,
  };
  // Why the config landed or did not. `fs` paths are relative to the WASI runtime root, and a
  // wrong guess here is otherwise invisible: the default is used and nothing says so.
  try {
    const raw = await fs.readFile("/app/config/renderer.json");
    out.probe = { read: "ok", length: String(raw).length };
  } catch (e) {
    out.probe = { read: "failed", error: String(e) };
  }
  if (cfg.renderer !== "component") {
    out.detail = "in-process minijinja (the default)";
    return out;
  }
  // The request is required, not optional: `originOf(null)` yields "" and wstd's HTTP client
  // panics on a relative URI — and a panic inside a guest surfaces to the caller as the opaque
  // "component responded unexpectedly", which is how this was found.
  const origin = originOf(req);
  if (!origin) {
    out.componentReachable = false;
    out.detail = "no request origin available; cannot probe the renderer component";
    return out;
  }
  try {
    const res = await http.request({ method: "GET", url: origin + "/render/capabilities" });
    const caps = JSON.parse(String(res.body));
    out.componentReachable = Number(res.status) === 200 && caps.aa_render === 1;
    out.detail = `${caps.renderer} speaks envelope ${caps.aa_render}, offers ${(caps.requires || []).length} capabilities`;
  } catch (e) {
    out.componentReachable = false;
    out.detail = "renderer component unreachable: " + e;
  }
  return out;
}
