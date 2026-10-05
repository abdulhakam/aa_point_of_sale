// /p/<slug> and /p/<slug>/data — a declarative page and its JSON payload, from a route FOLDER
// (tb-0030 step 5).
//
// A page slug can be multi-segment (`reports/profit` is one), so this is a `[...slug]` catch-all rather
// than a `{slug}` folder. It serves both shapes and tells them apart by the `/data` suffix.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    // The JSON endpoint: an uncapped payload for a programmatic consumer. The BROWSER no longer uses
    // it — a report page renders server-side through `renderReportPage` below.
    const dataMatch = /^\/p\/(.+)\/data$/.exec(path);
    if (dataMatch) {
      const slug = dataMatch[1];
      const def = await A.pages.readPage("/app/pages", slug);
      if (!def) return { text: "No such page", status: 404 };
      const filters = await A.reportRender.filtersFor(A, def, query);
      // The ETag keys on the DATA fingerprint, not on a snapshot version counter. The rows come from
      // `spooled.jsonPayload`, which reads base tables through the prelude — nothing here used the view
      // snapshot except for its version, so hydrating the declared views was pure cost.
      const version = await A.service.dataVersion();
      const etag = `W/"v3-${version}-${encodeURIComponent(JSON.stringify(filters))}"`;
      const headers: Record<string, string> = {
        etag,
        "cache-control": "private, no-cache",
        vary: "accept-encoding",
      };
      const ifNoneMatch = String((req.headers && req.headers["if-none-match"]) || "");
      if (ifNoneMatch === etag) {
        return { status: 304, body: "", contentType: "application/json; charset=utf-8", headers };
      }
      const reportName = (def.compute && def.compute.report) || null;
      // The rows are spliced into this payload and the whole body is serialised in Rust.
      const payload: any = { version, slug: def.slug, filters, meta: { report: reportName } };
      if (def.needs.tables.length) {
        await A.service.ensureTables(def.needs.tables);
        const tables: any = {};
        for (const table of def.needs.tables) tables[table] = A.service.baseTable(table);
        payload.tables = tables;
      }
      // No row cap here: an API consumer asked for the rows, so it gets every row.
      const totals = reportName ? await A.spooled.totalsFor(reportName, filters) : {};
      const body = await A.spooled.jsonPayload(reportName, filters, payload, totals, {});
      return { body, contentType: "application/json; charset=utf-8", headers };
    }

    const pageMatch = /^\/p\/(.+)$/.exec(path);
    if (!pageMatch) return { text: "Not found", status: 404 };
    const slug = pageMatch[1];
    const def = await A.pages.readPage("/app/pages", slug);
    if (!def) return { text: "No such page", status: 404 };

    // A page that names a report is the SAME page as `/reports/<key>` — one manifest, one template,
    // one rendering path.
    if (def.compute && typeof def.compute.report === "string" && (await A.spooled.names()).includes(def.compute.report)) {
      return A.reportRender.renderReportPage(A, db, req, user, path, query, def.compute.report, def);
    }

    // A page with no report behind it is still a page: filters and an empty table, rendered
    // server-side. It works with no JavaScript at all, which is the point of a declarative page.
    const options = A.reportPages.filterOptions(await A.refs.refs(await A.service.fingerprint()), def.fields);
    return routeKit.renderRoute(
      req,
      { user, active: "pages", title: def.title, template: `${def.slug}/${def.template}` },
      {
        meta: def,
        filters: await A.reportRender.filtersFor(A, def, query),
        options,
        // The rows are the host's business; a page with no statement behind it has none.
        columns: def.columns.map((c: any, i: number) => (i === 0 ? { ...c, lead: true } : c)),
        rows: [],
        totalsGroups: A.pages.bindTotalsGroups(def.totals || [], {}),
      }
    );
  };
})();
