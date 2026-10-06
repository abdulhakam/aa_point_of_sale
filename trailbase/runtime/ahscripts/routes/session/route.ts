// GET /session — the signed-in user's id, from a route FOLDER (tb-0030 conventions).
//
// The client-side migration plugin (tb-0026) needs the operator's `_user` id to attribute imported
// invoices to them, and `_user` is a HIDDEN table with no record API, so the id cannot be read from
// `/api/records/v1/_user`. This is the "small guest endpoint that returns the session user" the task
// names. The host resolves `req.user` from the auth cookie OR an `Authorization: Bearer` header
// (lib.rs), so the plugin's bearer-authenticated call is answered.
//
// Gated like every other app route, and it returns only the CALLER's own id — never another user's —
// so it leaks nothing about the user table.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    return { id: routeKit.userId(req), hex: routeKit.userHex(req), name: user.name };
  };
})();
