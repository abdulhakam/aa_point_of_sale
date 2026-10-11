// The report-page renderer — extracted from the dispatcher so `/reports/<key>` (and later `/p/<slug>`)
// can be served from route folders (tb-0030 step 5).
//
// Like `app/lib/context.js`, it closes over nothing dispatcher-local: the page tree is `/app/pages`
// (a constant), the shell is built from `__AA_BUSINESS__` (set by `app()`), and `loadModule` is the
// host global `__AA_LOAD__`. The dispatcher and the folders both reach it as `A.reportRender`.

const PAGES_DIR = "/app/pages";
const loadModule = globalThis.__AA_LOAD__;

// Rows a report page renders by default. The guest's minijinja render of tens of thousands of rows
// is the dominant cold cost (and can cross the ~20 s call deadline), so a page renders the first
// `RENDER_MAX_ROWS` rows with a "show all" link; `?all=1` renders everything, `?maxRows=N` overrides.
// Totals are always computed over every row — only the table body is capped.
export const RENDER_MAX_ROWS = 1000;

// The shared server-rendered report template. A manifest may override it with `view` (the general
// ledger does), which is how a report gets a bespoke layout without its own route.
const DEFAULT_REPORT_VIEW = "reports/report.html";

/** The page shell a report renders inside. Same shape the dispatcher's `shell()` produced. */
function shell(user, active, title) {
  const b = globalThis.__AA_BUSINESS__ || {
    name: "SAMPLE TRADERS",
    address: "123 Sample Street, Sample City",
    phone: "000-0000000",
  };
  return {
    appName: b.name,
    businessName: b.name,
    businessAddress: b.address,
    businessPhone: b.phone,
    user,
    active,
    title,
  };
}

function html(body) {
  return { html: body };
}

async function pageCacheGet(db, cacheKey) {
  try {
    const rows = await db.all("SELECT html FROM pagecache WHERE key = ?", [cacheKey]);
    return rows && rows.length ? String(rows[0][0]) : null;
  } catch {
    return null;
  }
}

async function pageCachePut(db, cacheKey, page) {
  try {
    await db.execute("CREATE TABLE IF NOT EXISTS pagecache (key TEXT PRIMARY KEY, html TEXT)");
    await db.execute("INSERT OR REPLACE INTO pagecache(key,html) VALUES(?,?)", [cacheKey, page]);
  } catch {
    // Cache is best effort; the page was already rendered.
  }
}

/**
 * Load the JavaScript a page declares in its manifest's `handlers`, merged into one object.
 *
 * Returns null when the page declares none, so a caller can test it directly. `loadModule` memoises by
 * path, so a handler is compiled once per runtime context however many times its page renders. A
 * handler that fails to load is logged and skipped, because a broken handler should cost one page's
 * bespoke behaviour rather than the whole report.
 */
async function loadPageHandlers(A, pageDef) {
  const declared = (pageDef && pageDef.handlers) || [];
  if (!declared.length) return null;
  const dir = `${PAGES_DIR}/${String(pageDef.slug || "")}`;
  const merged = {};
  let loaded = 0;
  for (const rel of declared) {
    try {
      Object.assign(merged, await loadModule(`${dir}/${rel}`));
      loaded++;
    } catch (e) {
      console.log(`[handlers] ${pageDef.slug}: ${rel} failed to load — ${(e && e.message) || String(e)}`);
    }
  }
  return loaded ? merged : null;
}

async function latestPeriod(A, source) {
  try {
    const period = await A.dates.defaultPeriod(await A.service.fingerprint(), source);
    return period.from ? period : null;
  } catch {
    return null;
  }
}

/**
 * Resolve only declared filter fields; a manifest controls the compute input.
 *
 * Async because a page's `from`/`to` default is not always the manifest's: when a report declares
 * both date fields and the URL carries neither, the window comes from the DATA. An explicit `?from=`
 * or `?to=` always wins; the manifest default is the last resort.
 */
export async function filtersFor(A, def, query) {
  const filters = {};
  for (const field of def.filters) {
    const raw = query[field.name];
    const value = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    filters[field.name] = field.type === "check" ? (value === "on" ? "on" : "") : value || field.value;
  }

  // The general ledger's opening balances are DECLARED by `spool.totals.openings` rather than by
  // `filters`, because they are binds that feed the totals statement, not query inputs with a default.
  //
  // ⚠️ They used to be unreachable. `filtersFor` looped `def.filters` only, and the general ledger
  // declares `from` and `to` — so `openingRecievables`, `openingPayables` and `openingCash` were never
  // placed in `filters`, which means BOTH the page's opening row AND the totals statement's `:openR` /
  // `:openP` / `:openC` binds always received "". Nothing in the UI shows these three, so there was no
  // visible symptom; the declaration was in the manifest the whole time, read by nobody.
  //
  // They are taken from the query string only, and only when the manifest declares them.
  const openings = (def.spool && def.spool.totals && def.spool.totals.openings) || {};
  for (const spec of Object.values(openings)) {
    const key = String(spec).replace(/^:/, "");
    if (!(key in filters) && query[key] !== undefined) {
      const raw = query[key];
      filters[key] = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    }
  }
  // A date filter whose manifest named a `source` takes its default from the DATA, not from
  // `monthStart()`/`today()` — those are `new Date()` inside the guest. The source is per filter, not
  // global. An explicit `?from=`/`?to=` always wins, and a filter that declares no source keeps its
  // manifest default. `app/lib/dates.js` is fingerprint-cached.
  const wanted = def.filters.filter((f) => f.dateSource && !query[f.name]);
  if (wanted.length) {
    try {
      const fp = await A.service.fingerprint();
      for (const field of wanted) {
        const period = await A.dates.defaultPeriod(fp, field.dateSource);
        if (!period.from) continue;
        if (field.name === "from" || field.name === "to") filters[field.name] = period[field.name];
        else if (!(field.name in query)) filters[field.name] = period.to;
      }
    } catch (e) {
      // A probe failure must not take the report down — the manifest default is a usable window —
      // but it must be VISIBLE, because the symptom otherwise is a page quietly opening on the wrong
      // month again, which is the defect this replaced.
      console.error("[dates] default period probe failed: " + String(e && e.message ? e.message : e));
    }
  }
  // The value stays a STRING. It used to be coerced to a Number here, and that silently broke the
  // Payment Type select: the template marks an option selected with
  // `filters[field.name] == o.value`, and `o.value` is a string, so `Number(2) == "2"` is false in
  // minijinja and no option came back selected — an applied filter that looked unapplied.
  return filters;
}

/** Render a report from its manifest, server-side. Shared by `/reports/<key>` and `/p/<slug>`. */
export async function renderReportPage(A, db, req, user, path, query, key, pageDef) {
  // `filtersFor` honours the manifest's declared defaults when the query does not carry the field.
  const filters = await filtersFor(A, pageDef, query);

  // htmx fragment request (http.js `isFragment`). It gates BOTH what is rendered (body-only vs full
  // document) and the cache key below, or a boosted nav to a report could be served the cached full
  // page (or the reverse) — a fragment swapped into `#app-main` would then contain a whole document.
  const fragment = A.http.isFragment(req);

  // Page handlers, resolved relative to the page's own directory. `normalizeMeta` has already rejected
  // absolute paths and `..`, so this cannot escape `app/pages/`. Thirteen of the fourteen pages declare
  // none and pay nothing.
  const pageHandlers = await loadPageHandlers(A, pageDef);

  const showAll = String(query.all || "") === "1";
  const requestedMax = Number(query.maxRows || 0);
  // Page size (rows per page). `maxRows` is a legacy override; the page is the unit of navigation now.
  const pageSize = requestedMax > 0 ? requestedMax : RENDER_MAX_ROWS;
  // -1 means "no cap", which is what a `LIMIT`-less statement wants; the page renders everything
  // rather than slicing in JS.
  const maxRows = showAll ? -1 : pageSize;

  // Rendered-page cache lookup. The fingerprint is the live data version, so any write misses; the
  // revision is a content hash of the app tree, so a code change misses too.
  let cacheKey = null;
  try {
    const fp = await A.service.fingerprint();
    const rev = await A.paths.runtimeRevision();
    cacheKey = JSON.stringify([rev, fp, (user && (user.email || user.name)) || "anon", key, filters, showAll, requestedMax, String(query.page || "1"), fragment]);
    const cached = await pageCacheGet(db, cacheKey);
    if (cached !== null) return html(cached);
  } catch {
    cacheKey = null;
  }

  const snap = await A.refs.refs(await A.service.fingerprint());
  const options = A.reportPages.filterOptions(snap, pageDef.fields);
  const missing = (pageDef.requires || []).filter((name) => !filters[name]);
  const rawQuery = String(req.query || "");
  const allHref = `${path}?${rawQuery ? rawQuery + "&" : ""}all=1`;
  const appliedLabels = pageDef.fields
    .filter((field) => filters[field.name])
    .map((field) => {
      const raw = String(filters[field.name]);
      if (field.type === "select") {
        const hit = (options[field.source] || []).find((o) => o.value === raw);
        return { label: field.label, value: hit ? hit.label : raw };
      }
      if (field.type === "check") return null;
      return { label: field.label, value: raw };
    })
    .filter(Boolean);
  // Everything the page renders apart from the rows, which the host splices in by KV key.
  const frame = {
    def: pageDef,
    // Mobile layout is additive: a narrow report turns into labelled cards, a wide one keeps its
    // grid and scrolls sideways. The first column is the row's identity and reads as a heading
    // inside a card, so it is marked `lead` and drops its own label.
    columns: pageDef.columns.map((c, i) => (i === 0 ? { ...c, lead: true } : c)),
    mobile: pageDef.columns.length <= 6 ? "cards" : "scroll",
    basePath: path,
    // The print link carries the filters that are on screen, so a sheet is the report the
    // operator was looking at rather than an unfiltered default.
    rawQuery,
    filters,
    options,
    appliedLabels,
    missing,
    // The legacy report's period line, `11-Apr-2026`, on the right of the title row.
    period: {
      from: A.dates.legacyDate(filters.from),
      to: A.dates.legacyDate(filters.to),
    },
  };
  const view = pageDef.view || DEFAULT_REPORT_VIEW;

  // The spool path. Two statements: the rows, and a one-row totals aggregate over the SAME statement.
  // Neither brings a row into QuickJS — the totals row is read back through the same KV handoff.
  const totals = missing.length ? { rowCount: 0 } : await A.spooled.totalsFor(key, filters);
  const total = Math.trunc(Number(totals.rowCount || 0));
  // Offset paging: `LIMIT pageSize OFFSET (page-1)*pageSize` on the statement, so each page is O(page
  // size) to render and the row count comes from the uncapped totals statement.
  const pageCount = showAll ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const pageNo = Math.min(Math.max(Math.floor(Number(query.page || 1)) || 1, 1), pageCount);
  const offset = showAll ? 0 : (pageNo - 1) * pageSize;
  const shown = maxRows < 0 ? total : Math.max(0, Math.min(pageSize, total - offset));
  const spools = missing.length ? [] : [{ field: "rows", key: (await A.spooled.spoolRows(key, filters, maxRows, offset)).key }];
  // Prev/Next keep the current filters and drop the paging params, so a click replaces the page rather
  // than appending a second one.
  const keepQuery = String(rawQuery || "")
    .split("&")
    .filter((p) => p && !/^(maxRows|all|page)=/.test(p))
    .join("&");
  const pageHref = (n) => `${path}?${keepQuery ? keepQuery + "&" : ""}page=${n}`;
  const page = await A.http.pageSpooled(req, { ...shell(user, "reports", pageDef.title), paper: "a4", fragment }, view, {
    ...frame,
    rowInfo: {
      shown,
      total,
      page: pageNo,
      pageCount,
      pageSize,
      first: total ? offset + 1 : 0,
      last: offset + shown,
      truncated: shown < total,
      allHref,
      prevHref: pageNo > 1 ? pageHref(pageNo - 1) : null,
      nextHref: pageNo < pageCount ? pageHref(pageNo + 1) : null,
      // Resolved only when the window is empty, and it is what lets the page say WHICH period has data
      // instead of only that this one does not. One fingerprint-cached probe.
      latest: missing.length || total > 0 ? null : await latestPeriod(A, pageDef.filters.find((f) => f.dateSource)?.dateSource),
    },
    totalsGroups: A.pages.bindTotalsGroups(pageDef.totals || [], totals),
    // Page handlers. The general ledger's opening row is an echo of three filter inputs, not a query
    // result — which is the case a handler is for.
    opening: pageHandlers && typeof pageHandlers.openingRow === "function" ? pageHandlers.openingRow(filters) : null,
    meta: {},
  }, spools);
  if (cacheKey) await pageCachePut(db, cacheKey, page);
  return html(page);
}
