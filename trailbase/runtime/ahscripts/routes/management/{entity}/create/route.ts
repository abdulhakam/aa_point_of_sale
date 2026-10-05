// POST /management/<entity>/create — the create write, from a route FOLDER (tb-0030 step 5).
//
// The host matches an EXACT path shape, so `create` is its own folder rather than a `{action}` one:
// a `{action}` folder would also match `…/<id>/anything` and push the routing decision back into a
// string comparison the host already does correctly. See `serving-a-route-from-a-route-folder`.
//
// The body is form-urlencoded, parsed by hand (`URLSearchParams` does not exist in the guest). The
// `required` check is the same one the dispatcher ran, so an empty POST is refused before the write.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/management\/([^/]+)\/create$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const entityKey = match[1];
    const entity = A.entities.ENTITIES[entityKey];
    if (!entity) return { text: "Unknown entity", status: 404 };

    const missing = A.management.missingRequired(entity, form);
    if (missing.length) return { error: "missing required fields", entity: entityKey, fields: missing };

    await routeKit.write(async () => {
      const newHex = await A.management.createRow(db, entity, form);
      await A.management.syncLinks(db, entity, newHex, form);
    });
    return { redirect: `/management/${entityKey}?status=ok&message=Created`, status: 303 };
  };
})();
