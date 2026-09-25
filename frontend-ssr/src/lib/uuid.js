/**
 * TrailBase id helpers.
 *
 * Reads return url-safe base64 ids (`AaDUohMoc6CQ6pZZGqRMDQ==`); writes of a
 * relation accept canonical UUID text. Relation columns come back as `{id}` or
 * `null`; enum codes come back as `{id: 0}` — and `0` is a real code, so the
 * accessors below are explicit about null.
 *
 * `relId` is re-exported from `compute/ids.js` so the browser runtime shares the
 * exact same implementation; `toUuid` needs `Buffer` and so stays Node-only.
 */
import { relId } from "../../compute/ids.js";

const b64ToBytes = (id) => {
  const std = id.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  return Buffer.from(padded, "base64");
};

/** Canonical UUID text for a read-side id (used when writing a relation). */
export function toUuid(id) {
  const hex = b64ToBytes(id).toString("hex");
  if (hex.length !== 32) return id;
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export { relId };
