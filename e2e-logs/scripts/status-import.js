(() => {
  const g = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : null; };
  const out = {
    status: g('mig-status'),
    message: g('mig-message'),
    records: g('mig-records'),
    current: g('mig-current'),
    pct: g('mig-pct'),
    errors: g('mig-error-total'),
    flash: g('mig-flash'),
  };
  const rows = Array.from(document.querySelectorAll('#mig-summary-body tr'));
  if (rows.length) {
    out.summary = rows.map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()).join('|'));
  }
  const errRows = document.querySelectorAll('#mig-errors-body tr').length;
  if (errRows) out.errorRows = errRows;
  return JSON.stringify(out);
})()
