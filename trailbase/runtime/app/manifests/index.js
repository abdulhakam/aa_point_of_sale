/**
 * Manifests: the parts of the app that are DATA, kept out of JavaScript.
 *
 * Everything here is a table the app used to declare by hand in a module — an entity's fields, a job's
 * steps, a MIME type. None of it is behaviour, and all of it was JavaScript that had to be edited to
 * change a label or add a column.
 *
 * The rule this module keeps: **a manifest is read once, and nothing else declares the same fact.**
 * `entities.json` is the only place an entity exists; `app/lib/entities.js` installs what it reads here.
 *
 * Read once, at app start, and cached: these are configuration, not per-request data, and re-reading a
 * JSON file on every lookup is the kind of cost that hides inside "the app feels slow".
 */

const DIR = "/app/manifests";

const cache = new Map();

/** Every manifest this directory must hold. Named so a missing one fails at start-up, not at first use. */
const REQUIRED = ["entities", "schema", "content-types", "static-mounts", "page-presets"];

async function read(name) {
  if (cache.has(name)) return cache.get(name);
  const raw = await fs.readFile(`${DIR}/${name}.json`);
  let value;
  try {
    value = JSON.parse(raw);
  } catch (e) {
    // Name the file. A malformed manifest otherwise surfaces as a JSON error with no path in it, from
    // whatever happened to read it first.
    throw new Error(`${name}.json is not valid JSON: ${e && e.message ? e.message : String(e)}`);
  }
  cache.set(name, value);
  return value;
}

export const contentTypes = () => read("content-types");

/** Which URL prefixes serve which directories under `/app`. Read by `routeKit.resolveMount`. */
export const staticMounts = () => read("static-mounts");

/**
 * Named page-filter/column presets a page manifest may reference by name. Read by `app/lib/pages.js`'s
 * `readMeta` and expanded in `normalizeMeta`, so fourteen page manifests stop spelling out the same
 * filter objects. In `REQUIRED`, so a missing or malformed file is a start-up failure, not a page that
 * silently loses its filters.
 */
export const pagePresets = () => read("page-presets");

/** Read every required manifest once, so a missing file is a start-up failure and not a first-use one. */
export async function loadAll() {
  const out = {};
  for (const name of REQUIRED) out[name] = await read(name);
  return out;
}
