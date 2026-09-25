import express from "express";
import { requireAuth } from "../lib/auth.js";
import { page } from "../lib/http.js";
import { loadPlugins } from "../lib/plugins.js";

/**
 * `/plugins` — the plugin hub. It lists every directory under `plugins/` from
 * its `meta.md`; each plugin's own static page is served straight off disk by
 * the static middleware mounted next to this router in `server.js`.
 */
export function pluginRoutes({ config, render }) {
  const router = express.Router();

  router.get("/plugins", requireAuth, (req, res) => {
    res.send(
      page(
        {
          appName: config.appName,
          render,
          user: { email: req.session?.email, name: req.session?.name },
          active: "plugins",
          title: "Plugins",
        },
        "plugins/index.html",
        { plugins: loadPlugins(config.pluginsDir) }
      )
    );
  });

  return router;
}
