(async function () {
  'use strict';
  var sampleStatus = document.getElementById('sample-accounts-status');
  try { await OPULE.ready; }
  catch (error) {
    sampleStatus.textContent = 'Sample accounts could not be loaded. Please refresh to try again.';
    throw error;
  }
  document.getElementById('area').innerHTML = OPULE.areaOptions('baliwag');
  var status = document.getElementById('account-status');
  var user = OPULE.getUser();
  if (user) status.textContent = 'Signed in as ' + user.name;
  document.getElementById('logout').hidden = !user;
  OPULE.initPageNavigation({
    root: document.getElementById('account-form'), nav: document.getElementById('account-modes'),
    defaultHash: '#sign-in', routes: { '#sign-in': 'login', '#create-account': 'register' },
    onChange: function (view) {
      var creating = view === 'register';
      var submit = document.getElementById('account-submit');
      submit.value = creating ? 'register' : 'login';
      submit.textContent = creating ? 'Create account' : 'Sign in';
      document.getElementById('password').autocomplete = creating ? 'new-password' : 'current-password';
      document.getElementById('password').minLength = creating ? 12 : 0;
      document.getElementById('name').required = creating;
      document.getElementById('name').disabled = !creating;
      document.getElementById('role').disabled = !creating;
      document.getElementById('area').disabled = !creating;
    }
  });
  var testAccounts = document.getElementById('test-accounts');
  if (OPULE.demoEnabled) {
    sampleStatus.textContent = 'Ready to use. Choose a buyer or seller account above.';
    testAccounts.querySelectorAll('[data-demo-account]').forEach(function (button) {
      button.disabled = false;
      button.addEventListener('click', async function () {
        testAccounts.querySelectorAll('button').forEach(function (item) { item.disabled = true; });
        sampleStatus.textContent = 'Opening your sample account...';
        try {
          var account = button.dataset.demoAccount;
          await OPULE.db.loginDemo(account);
          location.assign(account === 'alex' ? 'sell.html' : 'index.html');
        } catch (error) {
          sampleStatus.textContent = error.message;
          testAccounts.querySelectorAll('button').forEach(function (item) { item.disabled = false; });
        }
      });
    });
  } else sampleStatus.textContent = 'Sample accounts are not enabled on this server.';
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
      location.assign(result.user.role === 'seller' ? 'sell.html' : 'index.html');
    } catch (error) { status.textContent = error.message; }
    finally { event.submitter.disabled = false; }
  });
  document.getElementById('logout').addEventListener('click', async function () {
    try { await OPULE.db.api('auth/logout', 'POST', {}); location.reload(); }
    catch (error) { status.textContent = error.message; }
  });
})().catch(OPULE.db.report);
