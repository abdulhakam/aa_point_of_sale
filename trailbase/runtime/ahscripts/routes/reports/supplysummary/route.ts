// /reports/supplysummary — Supply Summary, from a LITERAL route folder (wins over `/reports/{key}`).
//
// A report whose INPUT is a submitted SET of sale invoices rather than a filter: the screen lists the
// sale invoices in a date range with checkboxes, the operator picks the ones to summarise and submits,
// and the result is a table of PRODUCTS (quantity, amount, total) with no invoice grouping. The
// aggregation is the spooled report `supplysummary` (SQL), selected by the `invoices` list bind.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const q = routeKit.parsePairs(String(req.query || ""));
    const text = (v: any) => (Array.isArray(v) ? String(v[0] ?? "") : v === undefined || v === null ? "" : String(v));

    // The date range narrows which sale invoices are offered. It defaults to the latest business
    // month, the same data-derived window every other report opens on (app/lib/dates.js).
    let from = text(q.from);
    let to = text(q.to);
    if (!from || !to) {
      try {
        const fp = await A.service.fingerprint();
        const period = await A.dates.defaultPeriod(fp, "invoice");
        if (period && period.from) { if (!from) from = String(period.from); if (!to) to = String(period.to); }
      } catch { /* a probe failure keeps whatever the query carried */ }
    }

    // The submitted selection: repeated `invoices=` params, each possibly comma-joined. Values are HEX
    // invoice ids (the query matches `hex(tv.invoice)`), normalised to upper case.
    const raw = Array.isArray(q.invoices) ? q.invoices : q.invoices === undefined ? [] : [q.invoices];
    const selected = raw
      .flatMap((s: any) => String(s).split(","))
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);

    // The sale invoices in range, as the pick list. Capped so a very wide range cannot render 9,000 rows.
    const lo = (from || "0000-01-01") + " 00:00:00";
    const hi = (to || "9999-12-31") + " 23:59:59.999Z";
    const invRows = (await db.all(
      "SELECT hex(i.id) AS hx, i.invoiceNo AS no, substr(i.dated, 1, 10) AS d, COALESCE(p.name, '') AS party " +
        "FROM invoices i LEFT JOIN parties p ON p.id = i.party " +
        "WHERE i.type = 1 AND i.deleted = 0 AND i.dated >= ? AND i.dated <= ? " +
        "ORDER BY i.invoiceNo DESC LIMIT 1000",
      [lo, hi]
    )) || [];
    const invoices = invRows.map((r: any) => ({
      hex: String(r[0]),
      no: String(r[1]),
      date: String(r[2]),
      party: String(r[3]),
      checked: selected.includes(String(r[0]).toUpperCase()),
    }));

    const b = (globalThis as any).__AA_BUSINESS__ || { name: "SAMPLE TRADERS", address: "", phone: "" };
    const shell = {
      appName: b.name,
      businessName: b.name,
      businessAddress: b.address,
      businessPhone: b.phone,
      user,
      active: "reports",
      title: "Supply Summary",
      paper: "a4",
      // This route renders through `A.http.page` directly rather than `renderRoute`, so it carries the
      // refdb version itself. `dataVersionIfWarm` never probes; an empty value makes the client sync.
      refdbVersion: A.service.dataVersionIfWarm(),
    };

    // The columns come from the page manifest — the single definition — not a second copy here.
    const pageDef = await A.pages.readPage("/app/pages", "reports/supplysummary");
    const columns = (pageDef && pageDef.columns) || [];

    const frame: any = {
      from,
      to,
      invoices,
      selectedCount: selected.length,
      columns,
      totals: null,
      rowInfo: null,
    };

    if (selected.length) {
      // ONE delimited text bind carries the whole list; the statement matches it with instr(). `from`/
      // `to` are passed too, so the statement restricts the scan to the range the pick-list showed.
      const all = String(text(q.all)) === "1";
      const pageSize = (A.reportRender && A.reportRender.RENDER_MAX_ROWS) || 1000;
      const filters = { invoices: "|" + selected.join("|") + "|", from, to };
      const totals = await A.spooled.totalsFor("supplysummary", filters);
      const total = Math.trunc(Number(totals.rowCount || 0));
      const pageCount = all ? 1 : Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(Math.max(Math.floor(Number(text(q.page)) || 1) || 1, 1), pageCount);
      const offset = all ? 0 : (page - 1) * pageSize;
      const cap = all ? -1 : pageSize;
      const handle = await A.spooled.spoolRows("supplysummary", filters, cap, offset);
      const shown = Number((handle && handle.rows) || 0);

      // Total ITEMS is the COUNT of products the summary lists — the number of rows, not the sum of
      // their units. It is the same `rowCount` the heading shows, carried into the totals block.
      const totalItems = total;

      const qbase = "from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to) + "&invoices=" + selected.join("&invoices=");
      const link = (extra: string) => "/reports/supplysummary?" + qbase + extra;

      frame.totals = totals;
      frame.totalItems = totalItems;
      frame.selectedCount = selected.length;
      frame.rowInfo = {
        shown,
        total,
        page,
        pageCount,
        pageSize,
        first: total ? offset + 1 : 0,
        last: offset + shown,
        truncated: shown < total,
        allHref: link("&all=1"),
        prevHref: page > 1 ? link("&page=" + (page - 1)) : null,
        nextHref: page < pageCount ? link("&page=" + (page + 1)) : null,
      };
      const pageOut = await A.http.pageSpooled(req, shell, "reports/supplysummary.html.jinja", frame, [{ field: "rows", key: handle.key }]);
      return { html: pageOut };
    }

    const page = await A.http.page(req, shell, "reports/supplysummary.html.jinja", frame);
    return { html: page };
  };
})();
