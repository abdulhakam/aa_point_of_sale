(() => {
  const f = document.querySelector('form.login');
  if (!f) return 'NO_LOGIN_FORM: ' + document.body.innerText.slice(0, 300);
  f.querySelector('input[name=email]').value = 'admin@localhost';
  f.querySelector('input[name=password]').value = 'administrator-0ne';
  f.submit();
  return 'submitted from ' + location.pathname;
})()
