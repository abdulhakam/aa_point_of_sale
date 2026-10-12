// POST /management/<entity>/<id>/update — the update write, from a route FOLDER (tb-0030 step 5).
//
// The id is padded base64url in the PATH and must be left raw: `=` is a legal path character, and
// percent-encoding it to `%3D` feeds the tolerant base64 decoder a `3` and a `D` as sextets, producing
// an id that matches no row — a silent no-op update that still redirects `303 ?message=Updated`.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/management\/([^/]+)\/([^/]+)\/update$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const entityKey = match[1];
    const entity = A.entities.ENTITIES[entityKey];
    if (!entity) return { text: "Unknown entity", status: 404 };
    const idHex = routeKit.b64ToHex(match[2]);

    const missing = A.management.missingRequired(entity, form);
    if (missing.length) return { error: "missing required fields", entity: entityKey, fields: missing };

    await routeKit.write(async () => {
      await A.management.updateRow(db, entity, form, idHex);
      await A.management.syncLinks(db, entity, idHex, form);
    });

    // htmx write: re-render the list with the flash (see the create route).
    if (A.http.isFragment(req)) {
      const view = await A.management.listView(A, entity, entityKey, { status: "ok", message: "Updated" });
      return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: `/management/${entityKey}?status=ok&message=Updated`, status: 303 };
  };
})();
