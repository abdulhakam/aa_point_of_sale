// Guest plugin registry — reads plugin manifests off the async guest fs.
// Every directory under `plugins/` is one plugin: meta.md (frontmatter) + index.html.

import { join } from "./paths.js";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const unquote = (s) => {
  const t = String(s).trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")) ? t.slice(1, -1) : t;
};

function parseMeta(raw) {
  const match = String(raw).match(FRONTMATTER);
  const fm = {};
  const body = (match ? raw.slice(match[0].length) : String(raw)).trim();
  if (match) {
    let listKey = null;
    for (const line of match[1].split(/\r?\n/)) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const item = /^\s*-\s+(.+)$/.exec(line);
      if (item && listKey) {
        fm[listKey].push(unquote(item[1]));
        continue;
      }
      const kv = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
      if (!kv) continue;
      const key = kv[1];
      const value = kv[2].trim();
      if (value === "") {
        fm[key] = [];
        listKey = key;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        fm[key] = value.slice(1, -1).split(",").map(unquote).filter(Boolean);
        listKey = null;
      } else {
        fm[key] = unquote(value);
        listKey = null;
      }
    }
  }
  return { fm, body };
}

const firstHeading = (body) => {
  const h = body.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : "";
};
const firstParagraph = (body) =>
  (body.split(/\r?\n\s*\r?\n/).find((part) => part.trim() && !part.trim().startsWith("#")) || "").trim();
const titleFromSlug = (slug) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const toArray = (v) => (Array.isArray(v) ? v : v ? [String(v)] : []);

export async function loadPlugins(pluginsDir) {
  const entries = await fs.readdir(pluginsDir);
  const plugins = [];
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const dir = join(pluginsDir, name);
    const files = await fs.readdir(dir);
    if (!files.length) continue; // a file, or an empty folder
    const metaFile = files.find((f) => f.toLowerCase() === "meta.md");
    const page = files.find((f) => f.toLowerCase() === "index.html") || files.find((f) => /\.html?$/i.test(f));
    let fm = {};
    let body = "";
    if (metaFile) {
      try {
        ({ fm, body } = parseMeta(await fs.readFile(join(dir, metaFile))));
      } catch {
        // unreadable meta.md: still list the folder with its derived name
      }
    }
    const order = Number(fm.order);
    plugins.push({
      slug: name,
      route: `/plugins/${name}/`,
      title: fm.title || firstHeading(body) || titleFromSlug(name),
      description: fm.description || firstParagraph(body),
      author: fm.author || "",
      license: fm.license || "",
      tags: toArray(fm.tags),
      order: Number.isFinite(order) ? order : 100,
      hasPage: Boolean(page),
    });
  }
  return plugins.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
