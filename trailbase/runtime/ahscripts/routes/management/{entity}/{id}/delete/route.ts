// POST /management/<entity>/<id>/delete — the delete write, from a route FOLDER (tb-0030 step 5).
//
// Soft or hard delete is the entity's own flag (`entities.json`), exactly as the dispatcher decided it.
// The id is padded base64url in the PATH and must be left raw — see the note in the sibling `update`.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const match = /^\/management\/([^/]+)\/([^/]+)\/delete$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const entityKey = match[1];
    const entity = A.entities.ENTITIES[entityKey];
    if (!entity) return { text: "Unknown entity", status: 404 };
    const idHex = routeKit.b64ToHex(match[2]);

    await routeKit.write(async () => {
      if (entity.softDelete) await A.management.softDeleteRow(db, entity, idHex);
      else await A.management.hardDeleteRow(db, entity, idHex);
    });

    // htmx write: re-render the list with the flash (see the create route).
    if (A.http.isFragment(req)) {
      const view = await A.management.listView(A, entity, entityKey, { status: "ok", message: "Deleted" });
      return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: `/management/${entityKey}?status=ok&message=Deleted`, status: 303 };
  };
})();
