#!/usr/bin/env node
/**
 * import-v1-tui.mjs — standalone TUI importer: PocketBase (v1) SQLite  ->  TrailBase `main.db`.
 *
 * Unlike the browser plugin (`app/plugins/import-from-v1/`), which writes through TrailBase's
 * record API, this tool writes **directly into the depot's SQLite file**. That buys three things
 * the API path cannot give:
 *
 *   1. **created/updated are preserved** — the record API stamps its own timestamps, so every
 *      imported row previously carried the import time. Here the source row's own `created` and
 *      `updated` are written verbatim.
 *   2. **Speed** — no HTTP, no per-row auth, no JSON round-trip: rows go in inside batched
 *      transactions (thousands per second, against ~168 rec/s for the API path).
 *   3. **A user without a session** — `invoices.invoice_maker` is attributed to a `_user` row read
 *      straight out of the destination. The first user is selected by default; any user can be
 *      picked in the TUI (or named with `--user`).
 *
 * Relationship mapping is the same contract as the plugin and is the point of the tool:
 *   - legacy `categories` IS the company list  -> written into `companies` (there is no
 *     `categories` table in the depot any more; `items.category` FKs to `companies`);
 *   - `parties.company` / `order_bookers.company` JSON arrays -> `party_companies` /
 *     `order_booker_companies` link rows;
 *   - `invoices_return_reference.original_invoices` -> `invoices`;
 *   - enum text -> integer codes; booleans -> 0/1; money amounts rounded to whole paisas.
 *
 * Usage:
 *   node tools/import-v1-tui.mjs
 *     [--source ../legacyforparity/backend/pb_data/data.db]
 *     [--dest   ./traildepot/data/main.db]
 *     [--user <email|username|index|hex-id>] [--wipe] [--dry-run] [--limit N] [--yes] [--plain]
 *
 * The TrailBase server must be stopped (or at least not writing) while this runs; it takes a
 * write lock on main.db. Stop the server if the run reports SQLITE_BUSY.
 *
 * Zero dependencies: `node:sqlite` (Node >= 22.5) for both databases, raw ANSI for the TUI.
 *
 * Exit status: 0 when the import completes with no failures, 1 otherwise.
 */

import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { randomFillSync } from "node:crypto";
import { resolve } from "node:path";
import readline from "node:readline";

/* ------------------------------------------------------------------ args */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      if (["wipe", "dry-run", "yes", "plain", "allow-no-user"].includes(key)) out[key] = true;
      else out[key] = argv[++i];
    }
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));

const DEFAULTS = {
  source: "legacyforparity/backend/pb_data/data.db",
  dest: "trailbase/traildepot/data/main.db",
};

if (argv.help) {
  console.log(`import-v1-tui — import a PocketBase (v1) database directly into TrailBase's main.db

  --source <path>       PocketBase data.db (default: ${DEFAULTS.source})
  --dest   <path>       TrailBase main.db      (default: ${DEFAULTS.dest})
  --user   <who>        _user to attribute invoice_maker to: index, email, username or hex id
                        (default: the first user in the table)
  --wipe                clear existing TrailBase business rows before importing
  --dry-run             read and map only; write nothing
  --limit  <n>          import at most n rows per collection (testing)
  --yes                 skip the interactive setup screen and start immediately
  --plain               no TUI: print progress as plain lines (logs / CI)
  --allow-no-user       permit an import when the destination has no _user rows
  -h, --help            this text`);
  process.exit(0);
}

const SOURCE = resolve(argv.source || DEFAULTS.source);
const DEST = resolve(argv.dest || DEFAULTS.dest);
const LIMIT = argv.limit ? Number(argv.limit) : 0;
const DRY = !!argv["dry-run"];
const PLAIN = !!argv.plain || !process.stdout.isTTY || !process.stdin.isTTY;
let WIPE = !!argv.wipe;

/* ---------------------------------------------------------- enum + transforms */

const ENUM_CODES = {
  party_types: { customer: 0, supplier: 1 },
  invoice_types: { purchase: 0, sale: 1, return: 2, difference: 3 },
  payment_types: { sending: 0, recieving: 1, return: 2 },
};

const text = (v) => (v === undefined || v === null ? "" : String(v));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const flag = (v) => (v === true || v === 1 || v === "1" || v === "true" ? 1 : 0);
/** An AMOUNT, rounded to whole paisas. Unit prices/costs/percentages are rates, left alone. */
const money = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const enumCode = (group, v) => {
  if (v === undefined || v === null || v === "") return null;
  const c = ENUM_CODES[group][String(v)];
  return c === undefined ? null : c;
};

const TS_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
function nowStamp() {
  return new Date().toISOString().replace("T", " ").replace(/(\.\d{3})\d*Z$/, "$1Z");
}
/** A source timestamp kept verbatim; only used for rows whose created/updated are unusable. */
const ts = (v) => (TS_RE.test(text(v)) ? text(v) : nowStamp());
/** A date-ish column: '' (unset) or the source text as-is. */
const dateText = (v) => text(v);

function parseJsonIds(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const a = JSON.parse(String(v));
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function msOf(stamp) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$/.exec(String(stamp || ""));
  if (!m) return Date.now();
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], m[7] ? +`0.${m[7]}` * 1000 : 0);
}

/* ------------------------------------------------------------ uuid v7 (monotonic) */

let lastMs = 0;
let seq = 0;
/** UUIDv7 derived from the source row's timestamp, monotonically unique within the run. */
function uuidV7(msHint) {
  const ms = Number.isFinite(msHint) ? msHint : Date.now();
  if (ms > lastMs) {
    lastMs = ms;
    seq = 0;
  } else {
    seq += 1;
    if (seq > 0xfff) {
      lastMs += 1;
      seq = 0;
    }
  }
  const b = Buffer.alloc(16);
  b.writeUIntBE(lastMs % 0xffffffffffff, 0, 6);
  b[6] = 0x70 | ((seq >> 8) & 0x0f);
  b[7] = seq & 0xff;
  const rnd = randomFillSync(Buffer.alloc(8));
  b[8] = 0x80 | (rnd[0] & 0x3f);
  for (let i = 1; i < 8; i++) b[8 + i] = rnd[i];
  return b;
}
const hexOf = (buf) => Buffer.from(buf).toString("hex");

/* --------------------------------------------------------------- the import plan */

/**
 * Collections in dependency order. `row(src, ctx)` returns destination values in `columns` order.
 * `ctx.ids[table]` maps source id -> destination id (BLOB); `ctx.maker` is the chosen `_user` id.
 */
const PLAN = [
  {
    source: "sections",
    table: "sections",
    columns: ["id", "name", "created", "updated"],
    row: (s, c) => [c.id(s), text(s.name), ts(s.created), ts(s.updated)],
  },
  {
    // The legacy `categories` collection is the company list; write it into `companies`.
    source: "categories",
    table: "companies",
    columns: ["id", "name", "deleted", "created", "updated"],
    row: (s, c) => [c.id(s), text(s.name), flag(s.deleted), ts(s.created), ts(s.updated)],
  },
  {
    source: "areas",
    table: "areas",
    columns: ["id", "name", "section", "deleted", "created", "updated"],
    row: (s, c) => [c.id(s), text(s.name), c.rel("sections", s.section), flag(s.deleted), ts(s.created), ts(s.updated)],
  },
  {
    source: "parties",
    table: "parties",
    columns: ["id", "name", "type", "phone", "address", "area", "deleted", "created", "updated"],
    row: (s, c) => [
      c.id(s),
      text(s.name),
      enumCode("party_types", s.type),
      text(s.phone),
      text(s.address),
      c.rel("areas", s.area),
      flag(s.deleted),
      ts(s.created),
      ts(s.updated),
    ],
    links: [{ table: "party_companies", self: "party", other: "company", field: "company", target: "companies" }],
  },
  {
    source: "order_bookers",
    table: "order_bookers",
    columns: ["id", "name", "phone", "deleted", "created", "updated"],
    row: (s, c) => [c.id(s), text(s.name), text(s.phone), flag(s.deleted), ts(s.created), ts(s.updated)],
    links: [{ table: "order_booker_companies", self: "order_booker", other: "company", field: "company", target: "companies" }],
  },
  {
    source: "items",
    table: "items",
    columns: ["id", "name", "category", "barcode", "display_id", "cost_price", "sale_price", "box_size_qty", "created", "updated"],
    row: (s, c) => [
      c.id(s),
      text(s.name),
      c.rel("companies", s.category),
      text(s.barcode),
      text(s.display_id),
      num(s.cost_price),
      num(s.sale_price),
      num(s.box_size_qty),
      ts(s.created),
      ts(s.updated),
    ],
  },
  {
    source: "expenses",
    table: "expenses",
    columns: ["id", "name", "description", "amount", "date", "created", "updated"],
    row: (s, c) => [c.id(s), text(s.name), text(s.description), money(s.amount), dateText(s.date), ts(s.created), ts(s.updated)],
  },
  {
    source: "invoices",
    table: "invoices",
    columns: ["id", "type", "invoiceNo", "party", "booker", "invoice_maker", "dated", "duedate", "description", "discount_1", "discount_2", "discount_rs", "completed", "deleted", "created", "updated"],
    row: (s, c) => [
      c.id(s),
      enumCode("invoice_types", s.type),
      num(s.invoiceNo),
      c.rel("parties", s.party),
      c.rel("order_bookers", s.booker),
      // tb-0026: a source `_user` id cannot be mapped; attribute every attributed row to the chosen
      // TrailBase user. Rows the source never attributed stay NULL.
      s.invoice_maker ? c.maker : null,
      dateText(s.dated),
      dateText(s.duedate),
      text(s.description),
      num(s.discount_1),
      num(s.discount_2),
      money(s.discount_rs),
      flag(s.completed),
      flag(s.deleted),
      ts(s.created),
      ts(s.updated),
    ],
    attributed: (s) => !!s.invoice_maker,
  },
  {
    source: "invoices_return_reference",
    table: "invoices_return_reference",
    columns: ["id", "original_invoices", "created", "updated"],
    row: (s, c) => [c.id(s), c.rel("invoices", s.original_invoices), ts(s.created), ts(s.updated)],
  },
  {
    source: "transactions",
    table: "transactions",
    columns: ["id", "invoice", "item", "cost_price", "price", "qty", "scheme", "discount_1", "discount_2", "discount_rs", "deleted", "created", "updated"],
    row: (s, c) => [
      c.id(s),
      c.rel("invoices", s.invoice),
      c.rel("items", s.item),
      num(s.cost_price),
      num(s.price),
      num(s.qty),
      num(s.scheme),
      num(s.discount_1),
      num(s.discount_2),
      money(s.discount_rs),
      flag(s.deleted),
      ts(s.created),
      ts(s.updated),
    ],
  },
  {
    source: "payments",
    table: "payments",
    columns: ["id", "invoice", "party", "paid_to", "type", "amount", "paid", "payment_date", "description", "created", "updated"],
    row: (s, c) => [
      c.id(s),
      c.rel("invoices", s.invoice),
      c.rel("parties", s.party),
      c.rel("order_bookers", s.paid_to),
      enumCode("payment_types", s.type),
      money(s.amount),
      flag(s.paid),
      dateText(s.payment_date),
      text(s.description),
      ts(s.created),
      ts(s.updated),
    ],
  },
];

/** Derived/transient tables cleared on --wipe, after the business tables. */
const WIPE_ORDER = [
  "payments",
  "transactions",
  "invoices_return_reference",
  "invoices", // cascades inv_doc
  "party_companies",
  "order_booker_companies",
  "items",
  "order_bookers",
  "parties",
  "expenses",
  "areas",
  "companies",
  "sections",
];
const WIPE_EXTRA = ["invoice_line_op", "invoice_create_key", "invoice_lock", "pagecache"];

/* --------------------------------------------------------------- database setup */

function registerFunctions(db) {
  // TrailBase registers these in its own connection; opening the file directly means the schema's
  // `CHECK (is_uuid_v7(id))` and `DEFAULT (uuid_v7())` need local equivalents.
  db.function("is_uuid_v7", { deterministic: true }, (b) => {
    if (b == null) return 0;
    const u = b instanceof Uint8Array ? b : new Uint8Array(b);
    return u.length === 16 && (u[6] >> 4) === 7 ? 1 : 0;
  });
  db.function("uuid_v7", { deterministic: false }, () => uuidV7(Date.now()));
  db.function("is_uuid", { deterministic: true }, (b) => {
    if (b == null) return 0;
    const u = b instanceof Uint8Array ? b : new Uint8Array(b);
    return u.length === 16 ? 1 : 0;
  });
  db.function("uuid_v4", { deterministic: false }, () => {
    const b = randomFillSync(Buffer.alloc(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    return b;
  });
  db.function("is_email", { deterministic: true }, (v) => (v == null || v === "" ? 0 : /@/.test(String(v)) ? 1 : 0));
  // `jsonschema` is variadic: jsonschema('std.FileUpload', file, 'image/png, image/jpeg').
  db.function("jsonschema", { varargs: true, deterministic: true }, () => 1);
}

const tableExists = (db, name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);

/* -------------------------------------------------------------------- the importer */

function createState() {
  return {
    status: "idle",
    phase: "",
    message: "",
    current: "",
    done: 0,
    total: 0,
    rate: null,
    startedAt: 0,
    finishedAt: 0,
    log: [],
    errors: [],
    errorTotal: 0,
    summary: {},
    attributedMakers: 0,
    stop: false,
    verify: null,
  };
}

class Importer {
  constructor(opts = {}) {
    this.opts = opts;
    this.state = createState();
    this.source = null;
    this.dest = null;
    this.srcCounts = {};
    this.absent = new Set();
    this.maker = null;
    this.makerLabel = "(none)";
    this.users = [];
    this.rateBuf = [];
  }

  log(level, message) {
    this.state.log.unshift({ level, message });
    if (this.state.log.length > 300) this.state.log.pop();
  }
  err(collection, id, message) {
    this.state.errorTotal++;
    if (this.state.errors.length < 500) this.state.errors.push({ collection, id, message });
  }

  open() {
    if (!existsSync(SOURCE)) throw new Error(`source database not found: ${SOURCE}`);
    if (!existsSync(DEST)) throw new Error(`destination depot not found: ${DEST} (start TrailBase once to create it)`);
    this.source = new DatabaseSync(SOURCE, { readOnly: true });
    this.dest = new DatabaseSync(DEST);
    registerFunctions(this.dest);
    this.dest.exec("PRAGMA busy_timeout=15000");
    this.dest.exec("PRAGMA foreign_keys=ON");
    this.users = this.dest.prepare("SELECT rowid AS rid, id, email, username, created FROM _user ORDER BY created, rowid").all();
    if (!this.users.length) {
      this.log("warn", "destination has no _user rows; invoice_maker will be imported as NULL. Create a user, or re-run with one.");
    }
    this.selectUser(this.opts.user);
  }

  selectUser(sel) {
    if (!this.users.length) {
      this.maker = null;
      this.makerLabel = "(none)";
      return;
    }
    let u = this.users[0];
    if (sel !== undefined && sel !== null && sel !== "") {
      const s = String(sel);
      const byIdx = /^\d+$/.test(s) ? this.users[Number(s)] : null;
      const byEmail = this.users.find((x) => String(x.email || "").toLowerCase() === s.toLowerCase());
      const byName = this.users.find((x) => String(x.username || "").toLowerCase() === s.toLowerCase());
      const byHex = this.users.find((x) => hexOf(x.id) === s.replace(/[^0-9a-f]/gi, "").toLowerCase());
      u = byIdx || byEmail || byName || byHex;
      if (!u) throw new Error(`--user "${s}" did not match any _user row (by index, email, username or hex id)`);
    }
    this.maker = u.id;
    this.makerLabel = `${u.email || u.username || "(no email)"} [${hexOf(u.id).slice(0, 8)}]`;
  }

  countSource() {
    this.state.total = 0;
    for (const step of PLAN) {
      this.state.summary[step.source] = { read: 0, created: 0, failed: 0, links: 0, absent: false };
      try {
        let c = this.source.prepare(`SELECT COUNT(*) AS c FROM "${step.source}"`).get().c;
        this.srcCounts[step.source] = c;
        if (LIMIT) c = Math.min(c, LIMIT);
        this.state.total += c;
      } catch {
        this.srcCounts[step.source] = 0;
        this.absent.add(step.source);
        this.state.summary[step.source].absent = true;
        this.log("warn", `${step.source}: not present in the source database, skipped.`);
      }
    }
  }

  wipe() {
    this.state.phase = "wipe";
    const clear = (name) => {
      if (!tableExists(this.dest, name)) return 0;
      this.state.current = name;
      this.state.message = `Clearing ${name} …`;
      const before = this.dest.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get().c;
      this.dest.exec(`DELETE FROM "${name}"`);
      return before;
    };
    for (const t of WIPE_ORDER) {
      const c = clear(t);
      if (c) this.log("info", `Wiped ${c.toLocaleString()} row(s) from ${t}.`);
    }
    for (const t of WIPE_EXTRA) {
      const c = clear(t);
      if (c) this.log("info", `Wiped ${c.toLocaleString()} row(s) from ${t} (transient).`);
    }
    this.reseed();
    this.state.current = "";
    this.state.message = "";
  }

  /**
   * Restore rows the schema itself seeds, which `--wipe` deletes along with the imported data.
   * `U1790400000` seeds exactly one party named `Difference` (idempotent by name), and the
   * difference report re-keys on it, so a wiped depot without it cannot enter a difference. Any
   * future seeded row belongs here too.
   */
  reseed() {
    if (!tableExists(this.dest, "parties")) return;
    const exists = this.dest.prepare("SELECT 1 FROM parties WHERE name = 'Difference'").get();
    if (exists) return;
    this.dest
      .prepare("INSERT INTO parties (name, type, deleted, created, updated) VALUES ('Difference', 0, 0, '2026-09-29 00:00:00.000Z', '2026-09-29 00:00:00.000Z')")
      .run();
    this.log("info", "Re-seeded the `Difference` counterparty party (U1790400000).");
  }

  ctxFor(ids) {
    const idCache = new Map();
    return {
      maker: this.maker,
      rel: (table, srcId) => {
        if (!srcId) return null;
        const m = ids[table];
        return (m && m.get(String(srcId))) || null;
      },
      id: (s) => {
        if (idCache.has(s.id)) return idCache.get(s.id);
        const buf = uuidV7(msOf(s.created));
        idCache.set(s.id, buf);
        return buf;
      },
    };
  }

  async run() {
    const st = this.state;
    st.status = "running";
    st.phase = "starting";
    st.startedAt = Date.now();

    this.countSource();
    if (DRY) this.log("info", `Dry run: ${st.total.toLocaleString()} source record(s); nothing will be written.`);

    if (WIPE && !DRY) {
      this.wipe();
      if (st.stop) return this.finish();
    }

    const ids = {};
    const pendingLinks = [];

    for (const step of PLAN) {
      if (st.stop) break;
      const stats = st.summary[step.source];
      if (this.absent.has(step.source)) continue;

      st.phase = "migrate";
      st.current = step.source;
      st.message = "";

      ids[step.table] = ids[step.table] || new Map();
      const ctx = this.ctxFor(ids);

      let rows;
      try {
        rows = this.source.prepare(`SELECT * FROM "${step.source}" ORDER BY created`).all();
      } catch (e) {
        this.log("warn", `Could not read ${step.source}: ${e.message}`);
        continue;
      }
      if (LIMIT) rows = rows.slice(0, LIMIT);

      if (DRY) {
        for (const s of rows) {
          stats.read++;
          st.done++;
          if (step.attributed && step.attributed(s)) st.attributedMakers++;
        }
        if (step.links) for (const s of rows) for (const l of step.links) stats.links += parseJsonIds(s[l.field]).length;
        this.sampleRate();
        this.log("info", `${step.source}: read ${rows.length.toLocaleString()}${step.links ? `, links ${stats.links}` : ""} (dry run).`);
        continue;
      }

      const colList = step.columns.map((c) => `"${c}"`).join(", ");
      const placeholders = step.columns.map(() => "?").join(", ");
      const insert = this.dest.prepare(`INSERT INTO "${step.table}" (${colList}) VALUES (${placeholders})`);

      const CHUNK = 1000;
      for (let i = 0; i < rows.length; i += CHUNK) {
        if (st.stop) break;
        const chunk = rows.slice(i, i + CHUNK);
        const apply = (s) => {
          stats.read++;
          st.done++;
          if (step.attributed && step.attributed(s)) st.attributedMakers++;
          try {
            insert.run(...step.row(s, ctx));
            ids[step.table].set(String(s.id), ctx.id(s));
            stats.created++;
          } catch (e) {
            stats.failed++;
            this.err(step.source, s.id, e.message);
          }
          if (step.links) {
            for (const l of step.links) {
              const targets = parseJsonIds(s[l.field]);
              if (targets.length) pendingLinks.push({ link: l, ownerSource: step.source, selfId: ctx.id(s), targets, created: s.created, updated: s.updated });
            }
          }
        };
        try {
          this.dest.exec("BEGIN");
          for (const s of chunk) apply(s);
          this.dest.exec("COMMIT");
        } catch (e) {
          try { this.dest.exec("ROLLBACK"); } catch {}
          this.err(step.source, "", `batch failed (${e.message}); retried row by row`);
          // Re-run the chunk outside a transaction; per-row errors are already counted by apply,
          // so guard against double counting by tracking how many rows were applied before the throw.
          // Simplest correct approach: reset this chunk's counters and redo.
          stats.read -= chunk.length;
          st.done -= chunk.length;
          for (const s of chunk) apply(s);
        }
        this.sampleRate();
        st.current = `${step.source} (${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()})`;
        await yieldToLoop();
      }

      this.log("info", `${step.source}: read ${stats.read.toLocaleString()}, created ${stats.created.toLocaleString()}, failed ${stats.failed.toLocaleString()}.`);
    }

    // Links, once every target collection exists.
    if (!DRY && pendingLinks.length && !st.stop) {
      st.phase = "links";
      st.current = "links";
      st.message = "";
      const byTable = new Map();
      for (const pl of pendingLinks) {
        if (!byTable.has(pl.link.table)) byTable.set(pl.link.table, []);
        byTable.get(pl.link.table).push(pl);
      }
      for (const [table, list] of byTable) {
        if (!tableExists(this.dest, table)) continue;
        const selfCol = list[0].link.self;
        const otherCol = list[0].link.other;
        const linkIns = this.dest.prepare(`INSERT OR IGNORE INTO "${table}" ("id", "${selfCol}", "${otherCol}", "created", "updated") VALUES (?,?,?,?,?)`);
        let made = 0;
        try {
          this.dest.exec("BEGIN");
          for (const pl of list) {
            const targetMap = ids[pl.link.target];
            for (const t of pl.targets) {
              const other = targetMap && targetMap.get(String(t));
              if (!other || !pl.selfId) continue;
              linkIns.run(uuidV7(msOf(pl.created)), pl.selfId, other, ts(pl.created), ts(pl.updated));
              made++;
            }
          }
          this.dest.exec("COMMIT");
        } catch (e) {
          try { this.dest.exec("ROLLBACK"); } catch {}
          this.err(table, "", e.message);
        }
        const owner = list[0].ownerSource;
        if (st.summary[owner]) st.summary[owner].links += made;
        this.log("info", `${table}: created ${made.toLocaleString()} link row(s).`);
      }
    }

    this.finish();
    if (!DRY && st.status === "done") this.verify();
    return st;
  }

  finish() {
    const st = this.state;
    st.status = st.stop ? "stopped" : st.errorTotal ? "done-with-errors" : "done";
    st.phase = "finished";
    st.current = "";
    st.rate = null;
    st.finishedAt = Date.now();
    if (st.attributedMakers) {
      this.log(
        "info",
        `${st.attributedMakers.toLocaleString()} invoice(s) had a source invoice_maker; each was attributed to ${this.makerLabel}. ` +
          `The column means "imported by" for these rows, not "created by".`
      );
    }
    this.log("info", `Finished in ${fmtDuration(st.finishedAt - st.startedAt)}. ${st.errorTotal ? st.errorTotal + " error(s)." : "No errors."}`);
  }

  verify() {
    const st = this.state;
    st.phase = "verify";
    const out = [];
    for (const step of PLAN) {
      if (this.absent.has(step.source) || !tableExists(this.dest, step.table)) continue;
      const srcN = LIMIT ? Math.min(this.srcCounts[step.source] || 0, LIMIT) : this.srcCounts[step.source] || 0;
      // The schema seeds rows the source never had; they are excluded from the count comparison.
      // Today: one `Difference` party (U1790400000).
      const seeded = step.table === "parties" ? this.dest.prepare("SELECT COUNT(*) AS c FROM parties WHERE name = 'Difference'").get().c : 0;
      const dstN = this.dest.prepare(`SELECT COUNT(*) AS c FROM "${step.table}"`).get().c;
      const importedN = dstN - seeded;
      const srcMin = this.source.prepare(`SELECT MIN(created) AS m FROM "${step.source}"`).get().m;
      const dstMin = this.dest.prepare(`SELECT MIN(created) AS m FROM "${step.table}"`).get().m;
      out.push({ table: step.source, source: srcN, dest: importedN, ok: srcN === importedN, srcMin, dstMin, dateOk: srcMin === dstMin, seeded });
    }
    st.verify = out;
    const bad = out.filter((r) => !r.ok || !r.dateOk);
    if (bad.length) for (const r of bad) this.log("warn", `verify: ${r.table} source ${r.source} vs dest ${r.dest}${r.dateOk ? "" : " (min created differs)"}`);
    else this.log("info", "verify: every collection's row count and earliest created match the source.");
  }

  sampleRate() {
    const now = Date.now();
    const done = this.state.done;
    const buf = this.rateBuf;
    const last = buf[buf.length - 1];
    if (!last || now - last.t >= 250) buf.push({ t: now, done });
    while (buf.length > 1 && now - buf[0].t > 5000) buf.shift();
    const first = buf[0];
    const dt = (now - first.t) / 1000;
    if (dt > 0 && done > first.done) this.state.rate = (done - first.done) / dt;
  }

  close() {
    try { this.source && this.source.close(); } catch {}
    try { this.dest && this.dest.close(); } catch {}
  }
}

const yieldToLoop = () => new Promise((r) => setImmediate(r));
function fmtDuration(ms) {
  if (!ms || ms < 0) return "—";
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + "s";
  const m = Math.floor(s / 60);
  return `${m}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
}
function fmtSpeed(rate) {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return "—";
  return rate >= 1 ? `${rate >= 10 ? rate.toFixed(0) : rate.toFixed(1)} rec/s` : `${(1 / rate).toFixed(1)} s/rec`;
}
const nf = (v) => Number(v || 0).toLocaleString();

/* ------------------------------------------------------------------------ TUI */

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m", invert: "\x1b[7m",
};
const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "");
const pad = (s, w) => s + " ".repeat(Math.max(0, w - strip(s).length));
const trunc = (s, w) => (strip(s).length <= w ? s : strip(s).slice(0, w - 1) + "…");

class Tui {
  constructor(importer) {
    this.imp = importer;
    this.cols = process.stdout.columns || 100;
    this.rows = process.stdout.rows || 30;
    this.mode = "setup";
    this.userIndex = 0;
    this.done = false;
    this.busy = false;
  }

  enter() {
    process.stdout.write("\x1b[?1049h\x1b[?25l\x1b[2J\x1b[H");
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    this.keyHandler = (_s, key) => this.onKey(key);
    process.stdin.on("keypress", this.keyHandler);
    this.onResize = () => { this.cols = process.stdout.columns || 100; this.rows = process.stdout.rows || 30; };
    process.stdout.on("resize", this.onResize);
    this.timer = setInterval(() => this.render(), 250);
    this.render();
  }

  leave() {
    if (this.timer) clearInterval(this.timer);
    process.stdin.removeListener("keypress", this.keyHandler);
    process.stdout.removeListener("resize", this.onResize);
    try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch {}
    process.stdin.pause();
    process.stdout.write("\x1b[?25h\x1b[?1049l");
  }

  onKey(key) {
    if (!key || this.busy) {
      if (key && key.ctrl && key.name === "c") this.quit();
      return;
    }
    if (key.ctrl && key.name === "c") return this.quit();
    if (this.mode === "setup") {
      const users = this.imp.users;
      if (key.name === "up") this.userIndex = Math.max(0, this.userIndex - 1);
      else if (key.name === "down") this.userIndex = Math.min(users.length - 1, this.userIndex + 1);
      else if (key.name === "w") WIPE = !WIPE;
      else if (key.name === "q" || key.name === "escape") return this.quit();
      else if (key.name === "return") {
        if (users[this.userIndex]) this.imp.selectUser(String(this.userIndex));
        this.mode = "running";
        this.busy = true;
        this.runImport();
        return;
      }
      this.render();
      return;
    }
    if (this.mode === "running") {
      if (key.name === "q" || key.name === "escape") {
        this.imp.state.stop = true;
        this.imp.log("warn", "Stop requested; finishing the current batch …");
      }
      return;
    }
    if (this.mode === "done" && (key.name === "q" || key.name === "escape" || key.name === "return")) this.quit();
  }

  async runImport() {
    try {
      await this.imp.run();
    } catch (e) {
      this.imp.state.status = "failed";
      this.imp.state.message = e.message || String(e);
      this.imp.log("error", this.imp.state.message);
    }
    this.busy = false;
    this.mode = "done";
    this.render();
  }

  quit() {
    this.done = true;
    this.imp.close();
    this.leave();
    this.printSummary();
    process.exit(this.imp.state.errorTotal || this.imp.state.status === "failed" ? 1 : 0);
  }

  printSummary() {
    const st = this.imp.state;
    console.log(`\nstatus=${st.status}${st.message ? "  " + st.message : ""}`);
    const rows = Object.entries(st.summary).filter(([, c]) => !c.absent);
    if (rows.length) {
      console.log(`${"collection".padEnd(30)}${"read".padStart(8)}${"created".padStart(9)}${"failed".padStart(8)}${"links".padStart(7)}`);
      for (const [k, c] of rows) console.log(`${k.padEnd(30)}${nf(c.read).padStart(8)}${nf(c.created).padStart(9)}${nf(c.failed).padStart(8)}${nf(c.links).padStart(7)}`);
    }
    const total = rows.reduce((a, [, c]) => a + c.created, 0);
    console.log(`\ntotal created: ${nf(total)}   errors: ${nf(st.errorTotal)}   elapsed: ${fmtDuration(st.finishedAt - st.startedAt)}`);
    console.log(`${nf(st.attributedMakers)} invoice(s) attributed to ${this.imp.makerLabel}`);
    for (const e of st.errors.slice(0, 20)) console.log(`  [${e.collection} ${e.id}] ${e.message}`);
    if (st.verify) {
      console.log("verification:");
      for (const r of st.verify) console.log(`  ${r.ok && r.dateOk ? "ok      " : "MISMATCH"} ${r.table.padEnd(28)} source ${nf(r.source)} / dest ${nf(r.dest)}  min ${r.srcMin} / ${r.dstMin}`);
    }
  }

  render() {
    if (this.done) return;
    const I = this.imp;
    const st = I.state;
    const w = Math.max(50, Math.min(this.cols, 130));
    const lines = [];
    const rule = C.gray + "  " + "─".repeat(w - 3) + C.reset;

    lines.push(C.cyan + C.bold + "  AA Point of Sale — v1 → TrailBase direct importer" + C.reset);
    lines.push(rule);

    if (this.mode === "setup") {
      lines.push(`  Source : ${C.bold}${SOURCE}${C.reset}`);
      lines.push(`  Dest   : ${C.bold}${DEST}${C.reset}`);
      lines.push(`  Mode   : ${DRY ? C.yellow + "DRY RUN (no writes)" + C.reset : "live"}    Wipe: ${WIPE ? C.red + "yes" + C.reset : "no"}${LIMIT ? `    Limit: ${LIMIT}/collection` : ""}`);
      lines.push("");
      lines.push(`  Attribute invoice_maker to ${C.bold}(first user selected by default)${C.reset}:`);
      if (!I.users.length) lines.push(`    ${C.yellow}(no _user rows in the destination — invoice_maker will be NULL)${C.reset}`);
      I.users.forEach((u, i) => {
        const sel = i === this.userIndex;
        const label = `${u.email || u.username || "(no email)"}   ${hexOf(u.id).slice(0, 8)}…`;
        lines.push(sel ? `  ${C.invert} ▶ ${pad(label, w - 8)}${C.reset}` : `    ${label}`);
      });
      lines.push("");
      lines.push(C.dim + "  ↑/↓ choose user    w toggle wipe    enter start    q quit" + C.reset);
    } else {
      lines.push(`  Source : ${SOURCE}`);
      lines.push(`  Dest   : ${DEST}`);
      lines.push(`  User   : ${I.makerLabel}${DRY ? "    " + C.yellow + "DRY RUN" + C.reset : ""}${WIPE ? "    " + C.red + "wipe" + C.reset : ""}`);
      lines.push("");

      const pct = st.total > 0 ? Math.min(100, (st.done / st.total) * 100) : 0;
      const barW = Math.max(10, w - 24);
      const filled = Math.round((pct / 100) * barW);
      const pbar = `${C.green}${"█".repeat(filled)}${C.gray}${"░".repeat(Math.max(0, barW - filled))}${C.reset}`;
      lines.push(`  ${C.bold}${st.status}${st.phase ? " · " + st.phase : ""}${C.reset}    ${pct.toFixed(1)}%`);
      lines.push(`  [${pbar}] ${st.total > 0 ? nf(st.done) + "/" + nf(st.total) : "—"}`);
      lines.push("");
      const elapsed = st.startedAt ? fmtDuration((st.finishedAt || Date.now()) - st.startedAt) : "—";
      lines.push(`  records ${C.bold}${st.total > 0 ? nf(st.done) + "/" + nf(st.total) : "—"}${C.reset}   speed ${C.bold}${fmtSpeed(st.rate)}${C.reset}   elapsed ${C.bold}${elapsed}${C.reset}   errors ${st.errorTotal ? C.red + nf(st.errorTotal) + C.reset : "0"}`);
      lines.push(`  current ${C.bold}${st.current || "—"}${C.reset}  ${trunc(st.message || "", w - 16)}`);
      lines.push("");

      lines.push(C.gray + `  ${pad("collection", 26)}${"read".padStart(8)}${"created".padStart(9)}${"failed".padStart(8)}${"links".padStart(7)}` + C.reset);
      for (const [k, c] of Object.entries(st.summary)) {
        const label = pad(k + (c.absent ? " (absent)" : ""), 26);
        const read = nf(c.read).padStart(8);
        const created = nf(c.created).padStart(9);
        const failed = (c.failed ? C.red : "") + String(c.failed).padStart(8) + (c.failed ? C.reset : "");
        const links = nf(c.links).padStart(7);
        lines.push(`  ${label}${read}${created}${failed}${links}`);
      }

      if (st.verify) {
        lines.push("");
        lines.push(C.bold + "  Verification" + C.reset);
        for (const r of st.verify) lines.push(`  ${r.ok && r.dateOk ? C.green + "ok      " + C.reset : C.red + "MISMATCH" + C.reset} ${pad(r.table, 26)} source ${nf(r.source)} / dest ${nf(r.dest)}`);
      }

      lines.push("");
      lines.push(C.bold + "  Log" + C.reset);
      const room = Math.max(3, this.rows - lines.length - 3);
      for (const entry of st.log.slice(0, room)) {
        const col = entry.level === "error" ? C.red : entry.level === "warn" ? C.yellow : C.gray;
        lines.push(`  ${col}${trunc(entry.message, w - 4)}${C.reset}`);
      }

      lines.push("");
      if (this.mode === "done") {
        lines.push(st.status === "done" ? C.green + C.bold + "  Import complete." + C.reset : st.errorTotal ? C.yellow + C.bold + "  Import finished with errors." + C.reset : C.bold + "  Stopped." + C.reset);
        if (!DRY) lines.push(C.dim + `  ${nf(st.attributedMakers)} invoice(s) attributed to ${I.makerLabel}.  press q to exit` + C.reset);
        else lines.push(C.dim + "  press q to exit" + C.reset);
      } else {
        lines.push(C.dim + "  q stop" + C.reset);
      }
    }

    const view = new Array(this.rows).fill("");
    for (let i = 0; i < Math.min(lines.length, this.rows); i++) view[i] = lines[i];
    process.stdout.write("\x1b[2J\x1b[H" + view.join("\n"));
  }
}

/* ------------------------------------------------------------------------- main */

async function main() {
  if (SOURCE === DEST) {
    console.error("source and destination are the same file; refusing.");
    process.exit(2);
  }
  const importer = new Importer({ user: argv.user });

  if (PLAIN) {
    try {
      importer.open();
      const st = await importer.run();
      importer.close();
      const rows = Object.entries(st.summary).filter(([, c]) => !c.absent);
      console.log(`\nimport ${st.status} in ${fmtDuration(st.finishedAt - st.startedAt)}`);
      console.log(`${"collection".padEnd(30)}${"read".padStart(8)}${"created".padStart(9)}${"failed".padStart(8)}${"links".padStart(7)}`);
      for (const [k, c] of rows) console.log(`${k.padEnd(30)}${nf(c.read).padStart(8)}${nf(c.created).padStart(9)}${nf(c.failed).padStart(8)}${nf(c.links).padStart(7)}`);
      for (const e of st.errors.slice(0, 30)) console.log(`  [${e.collection} ${e.id}] ${e.message}`);
      if (st.verify) for (const r of st.verify) console.log(`  ${r.ok && r.dateOk ? "ok" : "MISMATCH"} ${r.table} source ${nf(r.source)} / dest ${nf(r.dest)}`);
      process.exit(st.errorTotal || st.status === "failed" ? 1 : 0);
    } catch (e) {
      importer.close();
      console.error("import failed:", e.message || e);
      process.exit(1);
    }
  }

  const tui = new Tui(importer);
  try {
    importer.open();
  } catch (e) {
    console.error("cannot start:", e.message || e);
    process.exit(1);
  }
  const firstIdx = importer.users.findIndex((u) => hexOf(u.id) === hexOf(importer.maker));
  tui.userIndex = firstIdx > 0 ? firstIdx : 0;
  tui.enter();

  if (argv.yes) {
    tui.mode = "running";
    tui.busy = true;
    tui.render();
    await tui.runImport();
  }
  // Otherwise the setup screen waits for a keypress; onKey drives the import.
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
