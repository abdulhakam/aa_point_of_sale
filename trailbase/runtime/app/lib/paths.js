// Posix-ish path helpers for the guest (no node:path).

export function normalize(p) {
  const abs = String(p).startsWith("/");
  const parts = String(p).replace(/\\/g, "/").split("/");
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return (abs ? "/" : "") + out.join("/");
}

export function join(a, b) {
  return normalize(String(a).replace(/\/+$/, "") + "/" + String(b));
}

/* ----------------------------------------------------------------------- runtime revision
 *
 * A fingerprint of the app's own source: every file under `/app`, its path and its content.
 *
 * WHY IT EXISTS. The rendered-page cache keys on the live DATA fingerprint, so a write misses and
 * re-renders — but it said nothing about CODE. Edit a `.sql` file or a manifest, restart, and the
 * first request found a cache entry whose data fingerprint was still valid and served the OLD
 * html. That is invisible: the page looks right, the numbers are just yesterday's code. It cost an
 * hour of false negatives during the manifest migration, and it would have cost the same again
 * through [[tb-0032-manifest-first-refactor]], which is five phases of editing exactly these files.
 *
 * WHY A CONTENT HASH AND NOT A TIMESTAMP. The guest has `fs.readdir`, `fs.readFile` and `fs.exists`
 * and no `stat`, so mtime is not available, and a timestamp would also miss an edit that preserves it
 * (robocopy, a checkout, a restore from backup). Content cannot lie about what is being served.
 *
 * WHY IT IS SAFE TO MEMOISE. Once per process, at the first call. `RUN.BAT` always mirrors
 * `runtime\` into the depot and always restarts the server, so a new revision and a new process
 * arrive together; a change can never be missed by holding the value. Recomputing per request would
 * mean reading 582 KB of app source on every page view, which is the wrong trade for a cache that
 * exists to avoid work.
 *
 * FNV-1a, 32-bit, over `path\0length\0content` for every file in sorted order. It is a change
 * detector, not a checksum: a collision would serve one stale page until the next edit, and the
 * alternative — a crypto digest — would be much more code for the same job.
 */

// The runtime ROOT, not `/app`. `ahscripts/` is a sibling of `app/`, and `ahscripts/routes/_app/route.ts`
// is the dispatcher — 1,900 lines that decide every route. Walking `/app` alone covered 109 of the
// tree's 111 files and left the one file most likely to change during
// [[tb-0032-manifest-first-refactor]] outside the cache's view.
const REVISION_ROOT = "/";
let revision = null;

/** FNV-1a over a string, as 8 hex digits. */
function fnv1a(hash, text) {
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Every file under `dir`, depth-first, as `path\0length\0content` strings. Sorted, so the hash is
 * stable across runs.
 *
 * A directory is recognised by `readdir` returning entries, NOT by trying to read it: `readFile` on a
 * directory throws, and the bridge prints a `bridge error:` line to stderr every time — which is
 * where the per-render log noise in the 2026-10-02 sweep came from. This walk must not add to it.
 * A path that lists nothing is read as a file, so a 0-byte file still contributes to the hash; the
 * only false case is an empty directory, which would contribute a constant and be skipped, and the
 * runtime tree has none.
 */
async function walk(dir, out) {
  let entries = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return out;
  }
  for (const name of entries.slice().sort()) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    let children = [];
    try {
      children = await fs.readdir(full);
    } catch {
      children = [];
    }
    if (children.length) {
      await walk(full, out);
      continue;
    }
    let body = null;
    try {
      const read = await fs.readFile(full);
      body = read === null || read === undefined ? "" : String(read);
    } catch {
      body = null;
    }
    // The PATH is hashed whether or not the content came back. A read that fails still costs its
    // name to the hash, so adding, renaming or removing any file invalidates the cache; only an
    // in-place edit of a file the bridge cannot read is invisible. Hashing a path we skipped would
    // leave a hole whose size depends on what the bridge happens to refuse, which is not knowable
    // from here — measured, 2 of 111 files on this tree.
    out.push(body === null ? full.replace(/^\//, "") + "\0unreadable" : full.replace(/^\//, "") + "\0" + body.length + "\0" + body);
  }
  return out;
}

/**
 * A short token that changes whenever any app file changes, or "rev-0" if the walk failed.
 *
 * Never throws: a page must render even if the source tree is unreadable, and a constant is a
 * conservative answer (it behaves exactly as the cache behaved before this existed).
 */
export async function runtimeRevision() {
  if (revision !== null) return revision;
  try {
    const files = await walk(REVISION_ROOT, []);
    let hash = 0x811c9dc5;
    for (const file of files) hash = fnv1a(hash, file);
    revision = "rev-" + hash.toString(16).padStart(8, "0") + "-" + files.length;
  } catch {
    revision = "rev-0";
  }
  return revision;
}
