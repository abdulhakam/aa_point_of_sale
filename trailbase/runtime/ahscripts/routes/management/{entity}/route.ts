// /management/<entity> — the management list, served from a route FOLDER.
//
// The first route family off `_app/route.ts` (tb-0030 step 5). The host's `{entity}` param resolver
// matches this folder before the dispatcher fallback, so this file owns `/management/<entity>`; the
// dispatcher still owns `/management` (the index).
//
// Three things this file must do, all recorded in `serving-a-route-from-a-route-folder`:
//   - build the dispatcher's `req` shape itself (`path`, parsed `query`, `user`) — the host gives
//     `query` as a raw string and provides no parsed params;
//   - parse the query by hand, because `URLSearchParams` does not exist in the guest (QuickJS);
//   - wrap everything in ONE IIFE, because route files share a single QuickJS scope per evaluation,
//     so a top-level helper name would redeclare on the next request. Only `globalThis.GET` is published.
//
// `normalizePath`/`parsePairs` live in `app/lib/route-kit.js`, reached through `A.routeKit`, so the four
// management folders do not each carry a copy.
(function () {
  /** The resolved TrailBase user, in the shell's shape. */
  function userOf(req) {
    const u = req.user;
    if (!u || !u.id) return null;
    return { name: u.username || u.email || "User", email: u.email || "" };
  }

  (globalThis as any).GET = async (req: any) => {
    // The bundle was extracted to `app/lib/context.js` for exactly this: a route folder can build it
    // through the host's loader without ever calling the dispatcher.
    const ctx = await (globalThis as any).__AA_LOAD__("/app/lib/context.js");
    const A = await ctx.app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const query = routeKit.parsePairs(String(req.query || ""));
    const user = userOf(req);

    const match = /^\/management\/([^/]+)$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const entityKey = match[1];
    const entity = A.entities.ENTITIES[entityKey];
    if (!entity) return { text: "Unknown entity", status: 404 };

    const refs = await routeKit.refs();
    const options = A.management.optionLists(refs);
    const all = A.management.sortRows(await A.data.readTable(entity.api), entity.sort);
    const visible = all.filter((row: any) => !entity.softDelete || !row.deleted);
    const links = await A.management.loadLinks(entity);
    const editId = String(query.edit || "");
    const editRow = editId ? all.find((r: any) => r.id === editId) ?? null : null;

    return routeKit.renderRoute(
      req,
      { user, active: "management", title: entity.label, template: "management/list.html" },
      {
        entity,
        entityKey,
        columns: entity.columns,
        rows: A.management.displayRows(entity, visible, refs, links),
        fields: A.management.formFields(entity, editRow, options, links),
        editRow,
        status: query.status || "",
        message: query.message || "",
      }
    );
  };
})();
