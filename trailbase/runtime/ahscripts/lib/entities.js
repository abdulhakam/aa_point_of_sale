/**
 * Management-screen entity definitions.
 *
 * The table itself is DATA and lives in `/ahscripts/manifests/entities.json` — generated from this module on
 * 2026-10-03 and read back by it, so there is exactly one declaration of an entity. This file exists to
 * keep two things working:
 *
 *  - `ENTITIES` stays a **plain object**, because `inventory.js` imports it synchronously and reads it
 *    lazily inside a function. Making it a promise would push an `await` through every consumer for a
 *    table that is read once at start-up.
 *  - `install()` is how the manifest gets in. It runs from `app()` in the dispatcher, which is async.
 *
 * `Object.assign` rather than reassignment, because `inventory.js` holds a reference to `ENTITIES`
 * captured when it was imported — reassigning the binding would leave it pointing at the empty object.
 */

export const ENTITIES = {};

/**
 * Natural display order in the management hub. From the manifest, beside the table it belongs to.
 *
 * A FUNCTION, and this is not a style choice. The guest's ESM shim (`transformEsm`) builds the export
 * object with `__exports[n] = typeof n !== "undefined" ? n : undefined` — a **snapshot of the value at
 * load time**. So an `export let` reassigned by `install()` would leave `exports.ENTITY_ORDER` pointing
 * at the empty array it was initialised with, and the management hub would render with no entities while
 * every entity screen worked. A function reads the live value and is the only shape the shim supports
 * for "set after load".
 *
 * Caught by loading the hub after the manifest move: `/management/items` rendered correctly from the
 * manifest while `/management` listed nothing at all.
 */
let entityOrder = [];

/** The hub's display order. */
export function order() {
  return entityOrder;
}

/**
 * Adopt the manifest. Called once, from the dispatcher's `app()`.
 *
 * Throws rather than leaving the object empty: an un-populated `ENTITIES` does not crash — a management
 * screen renders with no fields and a save writes nothing, which is the worst shape this could take.
 */
export function install(manifest) {
  if (!manifest || typeof manifest !== "object" || !manifest.entities) {
    throw new Error("entities manifest is missing or malformed");
  }
  const names = Object.keys(manifest.entities);
  if (!names.length) throw new Error("entities manifest declares no entities");

  Object.assign(ENTITIES, manifest.entities);
  entityOrder = manifest.order || names;

  const missing = entityOrder.filter((k) => !ENTITIES[k]);
  if (missing.length) {
    throw new Error(`entities manifest: order names an entity that does not exist: ${missing.join(", ")}`);
  }
  const unlisted = names.filter((k) => !entityOrder.includes(k));
  if (unlisted.length) {
    throw new Error(`entities manifest: entity is not in the hub order: ${unlisted.join(", ")}`);
  }
  return ENTITIES;
}

/** True once `install()` has run — so a caller can fail loudly rather than read an empty table. */
export function ready() {
  return Object.keys(ENTITIES).length > 0;
}