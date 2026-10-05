/**
 * The data fingerprint, and the refresh job that probes it.
 *
 * What this used to be: a 376-line snapshot service that built thirteen derived views in JavaScript and
 * persisted them to SQLite (`mview` / `mview_meta`) so runtime threads could hydrate them. All of that is
 * gone as of 2026-10-03 (tb-0032 step 3) — the reports read base tables through `prelude.sql`, and
 * `app/compute/views.js` moved to `trailbase/tools/_src/legacy-views.js` as a verification fixture.
 *
 * What is left is genuinely small, and the size is the point: what a report costs is now its SQL, and
 * what "which data is this?" means is a probe of `count:newest updated` per table. That is the whole
 * remaining job.
 *
 * `invalidate()`, `refresh()` and `status()` are kept because they answer questions the app still asks —
 * "did anything change?", "is the refresh job healthy?", and "is this cached response still valid?".
 */

/**
 * `TABLES` and `readTables` come from `data.js`, which owns them. The first version of this file
 * hand-wrote its own seventeen-table list, which is precisely the duplication this task exists to
 * remove — and it had already drifted: `data.js` carries `party_types`, `invoice_types` and
 * `payment_types`, and notes that there is no `categories` table at all.
 */
import { TABLES, readTables } from "./data.js";

/** Base rows read on demand, for the page payload's `tables` key. Not a cache: a write must show. */
const base = {};

/** Base tables a page needs, read on demand (used by the page data endpoint). */
export async function ensureTables(tables) {
  const missing = (tables || []).filter((table) => base[table] === undefined);
  if (missing.length) {
    const rows = await readTables(missing);
    for (const table of missing) base[table] = rows[table];
  }
  return base;
}

export function baseTable(name) {
  return base[name] || [];
}

const state = {
  fingerprints: null,
  refreshedAt: null,
  lastRefresh: null,
  /** Bumped by `refresh()` so a caller can tell "nothing changed" from "never probed". */
  build: 0,
};

/**
 * Memoised ~1.5 s, so one request does not probe seventeen tables repeatedly.
 *
 * `stamp` is the cross-thread half of the memo, and it is the fix for a real staleness window. The memo
 * above is per-thread module state, and TrailBase serves requests on several runtime threads, so
 * `invalidate()` only ever cleared the thread that took the write. A read that landed on ANOTHER thread
 * could then use a fingerprint up to 1.5 s old, and everything keyed on it with it — `refs()` (so a party
 * created a moment ago was absent from the dropdown), `dataVersion()` (so the host's rendered-page cache
 * served the pre-write page). Observed intermittently in `tools/guest-smoke.mjs`: the same run that
 * passed 91/91 failed "the new party is the invoice's party" and "the item's own price is what the select
 * carries" on a later attempt, with no code change between them.
 * See [[fingerprint-memo-is-per-thread-so-a-read-after-a-write-can-be-stale]].
 *
 * The stamp lives in the shared TrailBase KV store — the one channel every runtime thread agrees on, and
 * already used for the sql/render handoff. `invalidate()` writes a fresh value there; a reader that sees
 * a stamp it has not probed at yet re-probes at once. The 1.5 s TTL stays as the floor, because a writer
 * outside this app (the record API, a script) cannot bump the stamp.
 */
let probe = { at: 0, fingerprint: null, map: null, stamp: null };

/** The shared invalidation stamp. `""`/null-tolerant: a missing KV degrades this to the old TTL-only memo. */
async function kvStamp() {
  const kv = globalThis.kv;
  if (!kv || typeof kv.get !== "function") return null;
  try {
    const value = await kv.get(KV_STAMP_KEY);
    return value === undefined || value === null ? "" : String(value);
  } catch {
    return null;
  }
}

async function probeFingerprints() {
  const out = {};
  for (const table of TABLES) {
    try {
      const rows = await sqlite.all(
        `SELECT COUNT(*) AS n, COALESCE(MAX("updated"), '') AS newest FROM "${table}"`,
        []
      );
      out[table] = `${rows[0][0]}:${rows[0][1]}`;
    } catch {
      // A table that is not there (older depot, or one already dropped) still needs an entry, or every
      // refresh would report it as changed.
      const rows = await sqlite.all(`SELECT COUNT(*) AS n FROM "${table}"`, []);
      out[table] = `${rows[0][0]}:`;
    }
  }
  return out;
}

function fpString(map) {
  return JSON.stringify(TABLES.map((t) => [t, map[t]]));
}

/**
 * The shared key a write bumps so the other runtime threads stop trusting their memo. See `probe`.
 * Namespaced because the KV store is shared with the sql/render handoff and the page spool.
 */
const KV_STAMP_KEY = "aa:data-stamp";

/** A fresh, unique stamp. Uniqueness is all that matters — nothing compares order. */
function newStamp() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/** The fingerprint as a string; re-probes when the memo is old or another thread has written. */
async function currentFingerprint() {
  const now = Date.now();
  const stamp = await kvStamp();
  const otherThreadWrote = stamp !== null && probe.stamp !== null && stamp !== probe.stamp;
  if (!probe.fingerprint || otherThreadWrote || now - probe.at > 1500) {
    const map = await probeFingerprints();
    // The stamp is read BEFORE the probe: a write that lands between the two leaves the memo holding a
    // stamp that no longer matches, so the next read re-probes rather than trusting a fingerprint that
    // may predate it. Reading it after would quietly mark the pre-write probe as current.
    probe = { at: now, fingerprint: fpString(map), map, stamp };
  }
  return probe.fingerprint;
}

/**
 * Public: the live data fingerprint, for callers that cache derived output (rendered pages, ETags).
 */
export async function fingerprint() {
  return currentFingerprint();
}

/**
 * Public: a small, stable integer for "which data is this?".
 *
 * This replaces the snapshot's in-memory version COUNTER, which `/p/<slug>/data` and
 * `/invoice/context` used to key on. The counter was wrong twice over: it ticked when the refresh job
 * ran rather than when the data changed, and it was per-process, so two runtime threads disagreed.
 *
 * The fingerprint is the honest key — it changes when the data changes — but it is a long JSON string
 * (`[["areas","0:…"],…]`). Slicing it produced `"[[\"areas\",\"0"` in both an ETag and a JSON payload,
 * which is double-encoded junk. So it is folded to a 31-bit FNV-1a instead: cheap, no dependency, and it
 * keeps `version` a NUMBER, which is the shape `/p/<slug>/data` has always published.
 */
export async function dataVersion() {
  const fp = await currentFingerprint();
  let h = 0x811c9dc5;
  for (let i = 0; i < fp.length; i++) {
    h ^= fp.charCodeAt(i);
    // h *= 16777619, kept in 32-bit range without Math.imul (not guaranteed in this runtime).
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h & 0x7fffffff;
}

/**
 * Forget the memoised fingerprint, so the next read re-probes.
 *
 * Called from `routeKit.write()` — i.e. by the TYPE of every mutation, not by remembering to do it. That
 * is the rule `reports.no_precomputation` turns on: a write cannot leave a cached derived answer standing.
 */
export async function invalidate() {
  probe = { at: 0, fingerprint: null, map: null, stamp: null };
  // Base rows are a read cache for the page payload, so a write must clear them too — otherwise
  // `/p/<slug>/data` would ship the item list from before the edit.
  for (const key of Object.keys(base)) delete base[key];
  state.build++;
  // Tell the other runtime threads. This thread's memo is already cleared above; without this the read on
  // another thread keeps its own up-to-1.5 s-old fingerprint and serves the pre-write page from the host's
  // cache. AWAITED, not fired and forgotten: the stamp has to be committed before the mutation's response
  // goes out, or the browser's redirect GET can arrive first and win the race to be stale. Best-effort —
  // a KV that is missing or failing degrades this to the TTL-only behaviour rather than failing a write.
  const kv = globalThis.kv;
  if (kv && typeof kv.set === "function") {
    try { await kv.set(KV_STAMP_KEY, newStamp()); } catch { /* TTL-only, as before */ }
  }
}

/**
 * The refresh job: probe every table and report what changed.
 *
 * It used to rebuild the views affected by the change, which is why it took `db` and why it consulted
 * `viewsAffectedBy`. It no longer has anything to rebuild — a report's cost is its SQL, executed on the
 * current data — so this is now a probe and a diff. `db` is still accepted so the call sites that pass
 * it keep working.
 */
export async function refresh(db) {
  const next = await probeFingerprints();
  const changed = state.fingerprints
    ? TABLES.filter((table) => state.fingerprints[table] !== next[table])
    : [...TABLES];
  state.fingerprints = next;
  state.refreshedAt = Date.now();
  state.lastRefresh = { changed, rebuilt: [] };
  if (changed.length) {
    // A change invalidates the memoised fingerprint as well, so a caller that reads `fingerprint()`
    // immediately afterwards sees the new data rather than a value from up to 1.5 s ago.
    probe = { at: Date.now(), fingerprint: fpString(next), map: next };
    state.build++;
  }
  return state;
}

export function status() {
  return {
    ready: state.fingerprints !== null,
    build: state.build,
    at: null,
    phase: "idle",
    tables: state.fingerprints ? Object.keys(state.fingerprints).length : 0,
    // No `views` / `rows` / `cachedReports` counters. They counted the retired view snapshot and the
    // retired JavaScript report cache, so they could only ever read 0 — and a counter that cannot move
    // is worse than none, because a check on it fails forever and looks like a defect. What caches a
    // report now is the composed-SQL cache in `spoolreports.js` and the rendered-page cache in the
    // dispatcher; neither is visible from here, and both have their own gates.
    views: 0,
    rows: 0,
    intervalMs: 0,
    fingerprints: state.fingerprints ? Object.keys(state.fingerprints).length : 0,
    refreshedAt: state.refreshedAt,
    lastRefresh: state.lastRefresh,
    // Shape compatibility with the Node service's `status()` (which reports a worker pool).
    workers: 1,
    idle: 1,
    queued: 0,
    inFlight: 0,
  };
}
