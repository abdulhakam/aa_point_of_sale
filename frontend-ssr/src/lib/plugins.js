import fs from "node:fs";
import path from "node:path";

/**
 * Plugin registry. Every directory under `plugins/` is one plugin:
 *   plugins/<slug>/meta.md      description + YAML frontmatter (title, author,
 *                              license, tags, order, ...)
 *   plugins/<slug>/index.html   the plugin's single static page
 *
 * The registry only reads metadata; the pages themselves are served as static
 * files, so a plugin is self-contained and can be added or removed by copying or
 * deleting its folder.
 */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const unquote = (s) => {
  const t = String(s).trim();
  return (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")) ? t.slice(1, -1) : t;
};

/** Minimal YAML frontmatter: `key: value`, inline `[a, b]` and block lists. */
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

/** Every plugin directory as a display record, in `order` then title order. */
export function loadPlugins(pluginsDir) {
  let entries;
  try {
    entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const plugins = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const dir = path.join(pluginsDir, entry.name);
    let files = [];
    try {
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const metaFile = files.find((f) => f.toLowerCase() === "meta.md");
    const page = files.find((f) => f.toLowerCase() === "index.html") || files.find((f) => /\.html?$/i.test(f));
    let fm = {};
    let body = "";
    if (metaFile) {
      try {
        ({ fm, body } = parseMeta(fs.readFileSync(path.join(dir, metaFile), "utf8")));
      } catch {
        // unreadable meta.md: still list the folder with its derived name
      }
    }
    const order = Number(fm.order);
    plugins.push({
      slug: entry.name,
      route: `/plugins/${entry.name}/`,
      title: fm.title || firstHeading(body) || titleFromSlug(entry.name),
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
