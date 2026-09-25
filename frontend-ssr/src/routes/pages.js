import express from "express";
import { gzipSync } from "node:zlib";
import { requireAuth } from "../lib/auth.js";
import { page, ah } from "../lib/http.js";
import { listPages, readPage } from "../lib/pages.js";

/** Bump when the shape of the data payload changes, so caches invalidate. */
const PAYLOAD_REVISION = 2;

/**
 * The generic page host.
 *
 * Nothing in this file knows anything about a specific page. It discovers folders
 * under `pages/`, renders the template their `meta.json` names, and serves the
 * base tables those pages declare. Adding a page is adding a folder — no code
 * here, or anywhere else in Node, changes.
 */
export function pageRoutes({ config, render, reports }) {
  const router = express.Router();

  const shell = (req, active, title) => ({
    appName: config.appName,
    render,
    user: { email: req.session?.email, name: req.session?.name },
    active,
    title,
  });

  router.get("/p", requireAuth, (req, res) => {
    res.send(page(shell(req, "pages", "Pages"), "pages/index.html", { pages: listPages(config.pagesDir) }));
  });

  /**
   * `/p/<slug>` and `/p/<slug>/data`. One handler, because an Express 4 wildcard
   * cannot also carry a literal suffix as a separate route.
   */
  router.get(
    "/p/*",
    requireAuth,
    ah(async (req, res) => {
      const rest = String(req.params[0] || "");
      const isData = rest.endsWith("/data");
      const def = readPage(config.pagesDir, isData ? rest.slice(0, -5) : rest);
      if (!def) return res.status(404).send("No such page");
      return isData ? sendData(req, res, def) : sendPage(req, res, def);
    })
  );

  function sendPage(req, res, def) {
    // One object for the runtime; `dataUrl` rides along so templates and the driver
    // agree on a single source of truth.
    const payload = { ...def, dataUrl: `/p/${def.slug}/data` };
    res.send(
      page(shell(req, "pages", def.title), `${def.slug}/${def.template}`, {
        meta: def,
        // Serialised here, not in the template: minijinja hands templates a proxy,
        // so `| json` on it yields `{}`. `<` is escaped so it cannot close the tag.
        metaJson: JSON.stringify(payload).replace(/</g, "\\u003c"),
      })
    );
  }

  /**
   * The page's data: the derived views it named (already built and cached by the
   * background job, so this is serialisation only), plus any raw tables it also
   * declared. The `ETag` carries a payload-shape revision and the snapshot's build
   * number, so a repeat visit revalidates to a `304` — and a change in what we
   * send (not just in the data) invalidates correctly.
   */
  async function sendData(req, res, def) {
    const snapshot = await reports.getViews(req.token);
    const etag = `W/"v${PAYLOAD_REVISION}-${snapshot.version}"`;
    res.set("cache-control", "private, no-cache");
    res.set("vary", "accept-encoding");
    res.set("etag", etag);
    if (req.headers["if-none-match"] === etag) return res.status(304).end();

    const views = {};
    for (const name of def.needs.views) views[name] = snapshot.views[name] ?? [];
    const tables = {};
    for (const table of def.needs.tables) tables[table] = snapshot.base[table] ?? [];

    const payload = { version: snapshot.version, slug: def.slug, views };
    if (def.needs.tables.length) payload.tables = tables;
    const body = Buffer.from(JSON.stringify(payload));
    res.set("content-type", "application/json; charset=utf-8");
    if (/\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
      res.set("content-encoding", "gzip");
      return res.send(gzipSync(body));
    }
    return res.send(body);
  }

  return router;
}
