// /settings — per-browser preferences, from a route FOLDER.
//
// The settings live in the browser (`localStorage`, `public/js/settings.js`); this route reads no data
// and writes none. It renders the defaults and the script hydrates them and saves on change.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    return routeKit.renderRoute(
      req,
      { user, active: "management", title: "Settings", template: "settings/page.html.jinja" },
      {}
    );
  };
})();
