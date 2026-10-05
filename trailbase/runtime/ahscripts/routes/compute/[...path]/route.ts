// /compute/<path> — a static mount, from a route FOLDER (tb-0030 step 5).
//
// Same mount table and `..` guard as `/static/*`; see that file. Served without the auth gate.
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
