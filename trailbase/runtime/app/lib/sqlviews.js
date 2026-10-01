// Runtime SQL view loader: reads `app/reports/sql/views/*.sql`, inlines dependencies as CTEs, and
// runs a view, returning rows shaped like the JS views (objects keyed by column name).
//
// Everything here is a runtime file: editing a .sql changes the report with no component rebuild
// ([[report-logic-stays-runtime-file-based]]).

const DIR = "/app/reports/sql/views";

let cache = null; // name -> sql text

async function load() {
  if (cache) return cache;
  const files = await fs.readdir(DIR);
  const out = {};
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    out[file.slice(0, -4)] = String(await fs.readFile(`${DIR}/${file}`)).trim();
  }
  cache = out;
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function depsOf(views, name) {
  const sql = views[name] ?? "";
  return Object.keys(views).filter((n) => n !== name && new RegExp(`\\b${escapeRe(n)}\\b`).test(sql));
}

/** The target view's SQL with every dependency inlined, in dependency order.
 * The target is wrapped in a subquery so a view that starts with its own `WITH` works. */
function compose(views, name) {
  const ctes = [];
  const seen = new Set();
  const add = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of depsOf(views, n)) add(d);
    ctes.push(`"${n}" AS (\n${views[n]}\n)`);
  };
  for (const d of depsOf(views, name)) add(d);
  // Always wrap the view in a subquery: `ORDER BY "id"` must resolve to the view's output column,
  // not to an ambiguous `id` in the view's own FROM/GROUP BY.
  const body = ctes.length
    ? `WITH ${ctes.join(",\n")}\nSELECT * FROM (\n${views[name]}\n) AS _report`
    : `SELECT * FROM (\n${views[name]}\n) AS _report`;
  return `${body}\nORDER BY "id" DESC`;
}

/** Column names of a view's own SELECT list (the outer projection), in order. */
function columnsOf(sql) {
  // Strip comments first: a comma inside a comment would be read as a column separator.
  const clean = sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
  const start = clean.search(/\bselect\b/i);
  if (start < 0) return [];
  let depth = 0;
  let end = -1;
  for (let i = start + 6; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && /^from\b/i.test(clean.slice(i))) {
      end = i;
      break;
    }
  }
  if (end < 0) return [];
  const list = clean.slice(start + 6, end);
  const parts = [];
  depth = 0;
  let current = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .map((p) => {
      const alias = /\sAS\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i.exec(p);
      if (alias) return alias[1];
      const dotted = /\.([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(p);
      if (dotted) return dotted[1];
      return p;
    });
}

/** Run a SQL view (composed) and return its rows as objects. */
export async function rows(name) {
  const views = await load();
  if (!views[name]) throw new Error(`No SQL view: ${name}`);
  const columns = columnsOf(views[name]);
  const raw = await sqlite.all(compose(views, name), []);
  return (raw ?? []).map((values) => {
    const row = {};
    for (let i = 0; i < columns.length; i++) row[columns[i]] = values[i];
    return row;
  });
}

export async function names() {
  return Object.keys(await load());
}
