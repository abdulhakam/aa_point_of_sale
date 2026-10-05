// /plugins/<path> — a plugin's static files, from a route FOLDER (tb-0030 step 5).
//
// The `/plugins` index is the sibling `plugins/route.ts`; this serves `/plugins/<name>/…` and, because
// this mount has `indexFallback`, `/plugins/<name>` -> that directory's index.html.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));

    const mount = routeKit.resolveMount(await A.manifests.staticMounts(), path);
    if (!mount || mount.refused) return { text: "Not found", status: 404 };
    if (mount.single) return routeKit.readStatic(mount.rel);
    if (mount.indexFallback) {
      if (mount.rel.endsWith("/") || mount.rel.indexOf(".") < 0) {
        const res = await routeKit.readStatic(mount.dir + "/" + mount.rel.replace(/\/$/, "") + "/index.html");
        if (res && res.status !== 404) return res;
      }
    }
    return routeKit.readStatic(mount.dir + "/" + mount.rel);
  };
})();
