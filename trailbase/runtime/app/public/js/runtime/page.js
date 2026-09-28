/**
 * The generic page driver.
 *
 * Reads the manifest the server embedded, requests its named report result and the
 * select-source tables, then fills the DOM. It knows nothing about any specific
 * page: the Jinja template renders filters, columns and totals labels.
 *
 * Timings are published on `window.__page` so the report speed can be measured
 * from outside.
 */

const metaEl = document.getElementById("page-meta");
if (metaEl) {
  try {
    start(JSON.parse(metaEl.textContent));
  } catch (error) {
    setStatus(`Bad page manifest: ${error.message}`, "error");
  }
}

function setStatus(text, state) {
  const el = document.querySelector("[data-page-status]");
  if (!el) return;
  el.textContent = text;
  el.dataset.state = state || "";
}

/**
 * Publish the timings. `navMs` is milliseconds since navigation start, i.e. the
 * whole cost of getting this report on screen, not just the compute.
 */
function publish(timer) {
  timer.navMs = Math.round(performance.now());
  window.__page = timer;
  return timer;
}

function start(meta) {
  const form = document.querySelector("[data-page-filters]");
  const tbody = document.querySelector("[data-page-rows]");
  let run = 0;

  const filters = () => {
    const out = {};
    if (form) {
      for (const field of form.querySelectorAll("[data-filter]")) {
        out[field.name] = field.type === "checkbox" ? (field.checked ? "on" : "") : field.value;
      }
    }
    return out;
  };

  /** Select options come only from declared source tables. */
  function fillSelects(tables) {
    if (!form) return;
    for (const field of meta.filters || []) {
      if (field.type !== "select" || !field.source) continue;
      const select = form.querySelector(`[data-filter][name="${field.name}"]`);
      if (!select) continue;
      const keep = select.value;
      select.textContent = "";
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "All";
      select.appendChild(all);
      for (const row of tables[field.source] || []) {
        const option = document.createElement("option");
        option.value = row.id;
        option.textContent = row.name ?? row.id;
        select.appendChild(option);
      }
      if (keep) select.value = keep;
    }
  }

  function renderRows(result) {
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    for (const row of result.rows || []) {
      const tr = document.createElement("tr");
      for (const column of meta.columns || []) {
        const td = document.createElement("td");
        if (column.right) td.className = "right";
        const value = row[column.key];
        td.textContent = value === null || value === undefined ? "" : String(value);
        tr.appendChild(td);
      }
      fragment.appendChild(tr);
    }
    tbody.textContent = "";
    tbody.appendChild(fragment);
  }

  function renderTotals(result) {
    for (const total of meta.totals || []) {
      const el = document.querySelector(`[data-total-key="${total.key}"]`);
      if (el) el.textContent = result.totals?.[total.key] ?? "";
    }
  }

  async function load(appliedFilters) {
    // Revalidation is the browser's job: the endpoint's ETag includes snapshot
    // version and declared filters, so a cached result is reused safely.
    const query = new URLSearchParams(appliedFilters);
    const url = query.size ? `${meta.dataUrl}?${query}` : meta.dataUrl;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`page data: HTTP ${res.status}`);
    const text = await res.text();
    const body = JSON.parse(text);
    return { version: body.version, result: body.result, tables: body.tables ?? {}, bytes: text.length };
  }

  async function rebuild() {
    const ticket = ++run;
    const timer = { slug: meta.slug, fetchMs: 0, computeMs: 0, renderMs: 0, totalMs: 0, rows: 0, bytes: 0, version: 0 };
    const started = performance.now();
    setStatus("Fetching data…");

    try {
      const appliedFilters = filters();
      const data = await load(appliedFilters);
      if (ticket !== run) return;
      timer.fetchMs = Math.round(performance.now() - started);
      timer.bytes = data.bytes;
      timer.version = data.version;
      fillSelects(data.tables);

      const missing = (meta.requires || []).filter((name) => !appliedFilters[name]);
      if (missing.length) {
        const field = (meta.filters || []).find((f) => f.name === missing[0]);
        if (tbody) tbody.textContent = "";
        setStatus(`Please select a ${String(field?.label ?? missing[0]).toLowerCase()} to view this report.`);
        timer.totalMs = Math.round(performance.now() - started);
        return publish(timer);
      }

      if (!data.result) {
        setStatus(`${meta.needs.tables.length} table(s) loaded · snapshot v${data.version}`, "ok");
        timer.totalMs = Math.round(performance.now() - started);
        return publish(timer);
      }

      if (ticket !== run) return;
      const result = data.result;
      const renderStart = performance.now();
      renderRows(result);
      renderTotals(result);
      timer.renderMs = Math.round(performance.now() - renderStart);
      timer.rows = (result.rows || []).length;
      timer.totalMs = Math.round(performance.now() - started);

      setStatus(
        `${timer.rows.toLocaleString()} row(s) · snapshot v${data.version}`
      );
    } catch (error) {
      if (ticket === run) setStatus(`Failed: ${error.message}`, "error");
    }
    publish(timer);
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      rebuild();
    });
    const reset = form.querySelector("[data-page-reset]");
    if (reset) reset.addEventListener("click", () => { form.reset(); rebuild(); });
  }

  rebuild();
}
