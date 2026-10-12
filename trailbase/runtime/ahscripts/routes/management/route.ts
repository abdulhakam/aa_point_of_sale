// /management — the management hub, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    // `order()` not `ENTITY_ORDER`: the ESM shim snapshots exports at load time, so a value that is set
    // after the module is loaded (`install()`, from the manifest) is only visible through a function.
    const entities = A.entities.order().map((key: string) => ({ key, ...A.entities.ENTITIES[key] }));
    return routeKit.renderRoute(
      req,
      { user, active: "management", title: "Management", template: "management/index.html.jinja" },
      { entities }
    );
  };
})();
