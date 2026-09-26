(() => {
  const g = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : null; };
  return JSON.stringify({
    s: g('mig-status'), m: g('mig-message'), rec: g('mig-records'),
    cur: g('mig-current'), pct: g('mig-pct'), err: g('mig-error-total'), flash: g('mig-flash'),
  });
})()
