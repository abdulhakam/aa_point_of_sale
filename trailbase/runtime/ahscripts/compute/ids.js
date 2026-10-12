/**
 * Environment-neutral id helpers — safe in Node and in a browser worker.
 *
 * The write-side `toUuid` stays in `src/lib/uuid.js` because it uses `Buffer`;
 * nothing in this folder may touch a Node API, so that `compute/` can be served
 * verbatim to the browser at `/compute/`.
 */

/** Read-side relation accessor: `{id}` | string | null  ->  id | null. */
export const relId = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v.id ?? null;
  return v;
};
