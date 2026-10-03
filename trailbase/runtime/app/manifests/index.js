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

export const entities = () => read("entities");
export const jobs = () => read("jobs");
export const contentTypes = () => read("content-types");

/** Everything, for a caller that wants it in one read. */
export async function all() {
  const [e, j, c] = await Promise.all([entities(), jobs(), contentTypes()]);
  return { entities: e, jobs: j, contentTypes: c };
}

/** Drop the cache, so a manifest edit is picked up without a restart. Used by the harnesses. */
export function invalidate() {
  cache.clear();
}