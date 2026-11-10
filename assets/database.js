(function () {
  'use strict';
  var cache = { listings: [], seller: null, buyerArea: '' };
  var user = null;
  function report(error) {
    console.error('Opule database operation failed:', error.message);
    var notice = document.getElementById('database-error');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'database-error';
      notice.className = 'loading-error database-error';
      notice.setAttribute('role', 'alert');
      document.body.appendChild(notice);
    }
    notice.textContent = error.message + ' Changes may not have been saved. Please retry.';
  }
  async function api(path, method, body) {
    if (location.protocol === 'file:') throw new Error('Open Opule through the local server at http://localhost:3000, not a file URL');
    var response = await fetch('/api/' + path, {
      method: method || 'GET', credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    var responseText = await response.text();
    var value;
    try { value = JSON.parse(responseText); }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new Error('The Opulé API returned a non-JSON response (HTTP ' + response.status + '). The API endpoint is missing or unavailable.');
    }
    if (!response.ok) throw new Error(value.error || 'The server rejected this operation');
    return value;
  }
  async function all(table) { return api('records/' + table); }
  async function get(table, id) { return (await all(table)).find(function (row) { return row.id === id; }) || null; }
  async function initialize() {
    var data = await api('bootstrap');
    cache.listings = data.listings;
    user = data.user;
    if (user) {
      cache.seller = await get('sellers', user.id);
      var area = await get('settings', 'buyer-area');
      cache.buyerArea = area ? area.value : '';
    }
    OPULE.SPOTS.splice.apply(OPULE.SPOTS, [0, OPULE.SPOTS.length].concat(data.venues));
    OPULE.demoEnabled = data.demoEnabled;
    OPULE.localDemoEnabled = data.localDemoEnabled === true;
  }
  OPULE.ready = initialize();
  OPULE.ready.catch(report);
  OPULE.getListings = function () { return cache.listings.slice(); };
  OPULE.getListing = function (id) { return cache.listings.find(function (row) { return row.id === id; }) || null; };
  OPULE.getSeller = function () { return cache.seller; };
  OPULE.getBuyerArea = function () { return cache.buyerArea; };
  OPULE.getUser = function () { return user; };
  OPULE.setBuyerArea = async function (area) { await api('settings/buyer-area', 'PUT', { value: area }); cache.buyerArea = area; };
  OPULE.setSeller = async function (seller) { cache.seller = await api('seller', 'PUT', seller); };
  OPULE.clearSeller = async function () { await api('seller', 'DELETE', {}); cache.seller = null; };
  OPULE.addListing = async function (listing) { var row = await api('listings', 'POST', listing); cache.listings.push(row); return row; };
  OPULE.db = {
    all: all, get: get, report: report, api: api,
    put: function (table, row) {
      if (table !== 'handovers') return Promise.reject(new Error('Record writes must use their dedicated API'));
      return api('handovers/' + encodeURIComponent(row.id), 'PUT', row);
    },
    messagesFor: function (id) { return api('messages/' + encodeURIComponent(id)); },
    sendMessage: function (id, senderId, text) { return api('messages/' + encodeURIComponent(id), 'POST', { senderId: senderId, text: text }); },
    reward: function (id) { return api('rewards/' + encodeURIComponent(id), 'POST', {}); },
    loginDemo: async function (id) { user = (await api('demo/login', 'POST', { id: id })).user; }
  };
})();
