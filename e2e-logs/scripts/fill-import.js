(() => {
  const set = (id, v) => { const e = document.getElementById(id); if (!e) return false; e.value = v; return true; };
  const pbUrl = document.getElementById('pb-url').value;
  const tbUrl = document.getElementById('tb-url').value;
  set('pb-identity', 'admin@admin.com');
  set('pb-password', '1234567890');
  set('tb-identity', 'admin@localhost');
  set('tb-password', 'administrator-0ne');
  document.getElementById('opt-wipe').checked = true;
  document.getElementById('opt-dry').checked = false;
  return JSON.stringify({
    pbUrl, tbUrl,
    pbIdentity: document.getElementById('pb-identity').value,
    pbPasswordLen: document.getElementById('pb-password').value.length,
    tbIdentity: document.getElementById('tb-identity').value,
    tbPasswordLen: document.getElementById('tb-password').value.length,
    wipe: document.getElementById('opt-wipe').checked,
    dry: document.getElementById('opt-dry').checked,
  });
})()
