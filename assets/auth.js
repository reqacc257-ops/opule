(async function () {
  'use strict';
  await OPULE.ready;
  document.getElementById('area').innerHTML = OPULE.areaOptions('baliwag');
  var status = document.getElementById('account-status');
  var user = OPULE.getUser();
  if (user) status.textContent = 'Signed in as ' + user.name;
  var testAccounts = document.getElementById('test-accounts');
  if (OPULE.demoEnabled) {
    testAccounts.hidden = false;
    testAccounts.querySelectorAll('[data-demo-account]').forEach(function (button) {
      button.addEventListener('click', async function () {
        testAccounts.querySelectorAll('button').forEach(function (item) { item.disabled = true; });
        try {
          var account = button.dataset.demoAccount;
          await OPULE.db.loginDemo(account);
          location.assign('demo.html?account=' + encodeURIComponent(account) + '&live=1');
        } catch (error) {
          status.textContent = error.message;
          testAccounts.querySelectorAll('button').forEach(function (item) { item.disabled = false; });
        }
      });
    });
  }
  document.getElementById('account-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var action = event.submitter.value;
    var body = { email: document.getElementById('email').value, password: document.getElementById('password').value };
    if (action === 'register') {
      body.name = document.getElementById('name').value;
      body.role = document.getElementById('role').value;
      body.area = document.getElementById('area').value;
    }
    event.submitter.disabled = true;
    try {
      var result = await OPULE.db.api('auth/' + action, 'POST', body);
      document.getElementById('password').value = '';
      status.textContent = 'Signed in as ' + result.user.name;
      location.assign(result.user.role === 'seller' ? 'register.html' : 'index.html');
    } catch (error) { status.textContent = error.message; }
    finally { event.submitter.disabled = false; }
  });
  document.getElementById('logout').addEventListener('click', async function () {
    try { await OPULE.db.api('auth/logout', 'POST', {}); location.reload(); }
    catch (error) { status.textContent = error.message; }
  });
})().catch(OPULE.db.report);
