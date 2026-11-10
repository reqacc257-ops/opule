import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

class Element {
  constructor(fragment = false) {
    this.fragment = fragment;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.classList = { add() {} };
  }
  appendChild(node) {
    this.children.push(...(node.fragment ? node.children : [node]));
    return node;
  }
  append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  removeAttribute(name) { delete this.attributes[name]; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  async fire(name) { await this.listeners[name]?.({ target: this, preventDefault() {} }); }
  focus() {}
}

function harness(overrides = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const listings = [
    { id: 'one & two', title: 'Prada Tote', category: 'Bags', price: 34000, area: 'malolos', sellerId: 'alex', sample: true, image: 'assets/images/tote.jpg' },
    { id: 'ring', title: 'Diamond ring', category: 'Jewelry', price: 150000, area: 'baliwag', sellerId: 'alex' },
    { id: 'other', title: 'Gucci bag', category: 'Bags', price: 73000, area: 'baliwag', sellerId: 'another' }
  ];
  const errors = [];
  const OPULE = {
    ready: Promise.resolve(), AREAS: [{ id: 'baliwag', name: 'Baliwag' }],
    getListings: () => listings.slice(), getUser: () => null, getSeller: () => null,
    areaById: () => ({ name: 'Baliwag' }), peso: value => String(value),
    esc: value => String(value).replaceAll('<', '&lt;'), areaOptions: () => '',
    fmtDate: date => date.toISOString().slice(0, 10),
    db: { report: error => errors.push(error), all: async () => [] },
    ...overrides
  };
  OPULE.renderListingManagement = (catalog, rows) => {
    catalog.replaceChildren();
    rows.forEach(row => catalog.appendChild(OPULE.listingCard(row)));
  };
  OPULE.renderInbox = () => {};
  const document = {
    body: new Element(), createElement: () => new Element(), createDocumentFragment: () => new Element(true),
    getElementById: element, querySelector: element, querySelectorAll: () => []
  };
  const views = ['overview', 'collection', 'correspondence'].map(name => {
    const panel = element('view-' + name);
    panel.setAttribute('data-studio-view', name);
    return panel;
  });
  element('sell-root').querySelectorAll = () => element('sell-root').innerHTML.includes('data-studio-view') ? views : [];
  element('sell-root').querySelector = selector => element('view-' + selector.match(/"([^"]+)"/)[1]);
  const nav = new Element();
  const links = ['#sell-root', '#studio-listings', '#studio-enquiries'].map((href, index) => {
    const link = new Element();
    link.setAttribute('href', href);
    Object.assign(link, { parentElement: nav, offsetLeft: 0, offsetTop: index * 76, offsetWidth: 222, offsetHeight: 68 });
    return link;
  });
  nav.querySelectorAll = () => links;
  nav.querySelector = () => links.find(link => link.hasAttribute('aria-current'));
  document.querySelector = selector => selector === '.studio-sidebar .workspace-nav' ? nav : element(selector);
  document.querySelectorAll = selector => selector.includes('.workspace-nav') ? links : [];
  const buyerNav = new Element();
  const buyerLinks = ['#edit', '#browse', '#how'].map(href => {
    const link = new Element();
    link.setAttribute('href', href);
    return link;
  });
  buyerNav.querySelectorAll = () => buyerLinks;
  buyerNav.querySelector = () => buyerLinks.find(link => link.hasAttribute('aria-current'));
  const originalQuery = document.querySelector;
  document.querySelector = selector => selector === '[aria-label="Buyer navigation"]' ? buyerNav : originalQuery(selector);
  element('buyer-root').querySelectorAll = () => ['edit', 'browse', 'approach'].map(view => {
    const panel = element('buyer-view-' + view);
    panel.setAttribute('data-page-view', view);
    return panel;
  });
  const events = {};
  element('market-filters').querySelector = () => element('category');
  element('market-filters').reset = async () => {
    ['category', 'market-area', 'market-price'].forEach(id => { element(id).value = ''; });
    await element('market-filters').fire('reset');
  };
  const context = {
    OPULE, document, location: { hash: '' }, requestAnimationFrame: callback => callback(),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    MutationObserver: class { observe() {} },
    window: {
      addEventListener: (name, callback) => { events[name] = callback; }, scrollTo() {},
      history: { pushState: (state, title, hash) => { context.location.hash = hash; } }
    }
  };
  const run = name => runInNewContext(readFileSync(new URL('../../assets/' + name + '.js', import.meta.url), 'utf8'), context);
  run('marketplace');
  run('navigation');
  run('seller-studio');
  return {
    element, listings, errors, OPULE, run, location: context.location,
    navigate(hash) { context.location.hash = hash; events.hashchange(); },
    click(hash, options = {}) {
      let prevented = false;
      const link = { getAttribute: () => hash, hasAttribute: () => false };
      element('sell-root').listeners.click({
        button: 0, target: { closest: () => link },
        preventDefault() { prevented = true; }, ...options
      });
      return prevented;
    }
  };
}

test('marketplace cards use literal text, encoded links, and honest image placeholders', () => {
  const { OPULE, listings } = harness();
  const card = OPULE.listingCard({ ...listings[0], title: '<img onerror=alert(1)>' });
  assert.equal(card.href, 'listing.html?id=one%20%26%20two');
  assert.equal(card.children[1].children[2].textContent, '<img onerror=alert(1)>');
  assert.equal(card.children[1].children[2].innerHTML, '');
  assert.match(card.children[0].children[1].textContent, /stock image/);
  const missing = OPULE.listingCard(listings[1]);
  assert.equal(missing.children[0].children[0].textContent, 'Photography pending');
});

test('buyer filters combine search, category, area, price, sorting, empty and reset states', async () => {
  const { run, element, errors, navigate } = harness();
  await run('index-page');
  assert.equal(element('ledger').children.length, 0);
  navigate('#browse');
  const count = () => element('ledger').children.length;
  const titles = () => element('ledger').children.map(card => card.children[1].children[2].textContent);
  assert.equal(count(), 3);
  assert.equal(element('ledger').attributes['aria-busy'], 'false');
  element('market-search').value = 'PRADA';
  await element('market-search').fire('input');
  assert.deepEqual(titles(), ['Prada Tote']);
  element('market-search').value = '';
  element('category').value = 'Bags';
  element('market-area').value = 'baliwag';
  element('market-price').value = '80000';
  await element('market-filters').fire('change');
  assert.deepEqual(titles(), ['Gucci bag']);
  element('market-price').value = '20000';
  await element('market-price').fire('input');
  assert.equal(count(), 0);
  assert.equal(element('market-empty').hidden, false);
  await element('empty-reset').fire('click');
  assert.equal(count(), 3);
  element('market-sort').value = 'price-high';
  await element('market-sort').fire('change');
  assert.deepEqual(titles(), ['Diamond ring', 'Gucci bag', 'Prada Tote']);
  element('market-sort').value = 'price-low';
  await element('market-sort').fire('change');
  assert.deepEqual(titles(), ['Prada Tote', 'Gucci bag', 'Diamond ring']);
  navigate('#how');
  assert.equal(element('buyer-view-browse').hidden, true);
  assert.equal(element('buyer-refinements').hidden, true);
  navigate('#browse');
  assert.equal(element('market-sort').value, 'price-low');
  assert.equal(element('buyer-refinements').hidden, false);
  assert.deepEqual(errors, []);
});

test('sample studio uses account identity, scopes inventory and counts, and hides publishing', async () => {
  const { run, element, errors, navigate } = harness({
    getUser: () => ({ id: 'alex', name: 'Alex S.', role: 'seller', demo: true }),
    getSeller: () => ({ id: 'alex', status: 'verified', demo: true }),
    db: {
      report: error => { throw error; },
      messagesFor: async () => [],
      all: async table => table === 'users' ? [{ id: 'jamie', name: 'Jamie R.', initials: 'JR', area: 'Baliwag', transactions: 8 }] :
        table === 'conversations' ? [{ id: 'chat', buyerId: 'jamie', listingId: 'one & two', sellerId: 'alex' }, { sellerId: 'other' }] :
        [{ conversationId: 'chat', sellerId: 'alex', completed: false, updatedAt: '2026-01-02' },
          { conversationId: 'chat', sellerId: 'alex', completed: true, updatedAt: '2026-01-01' }, { sellerId: 'other', completed: false }]
    }
  });
  await run('sell-page');
  navigate('#studio-listings');
  assert.match(element('studio-inventory-count').textContent, /2 of 2/);
  assert.doesNotMatch(element('seller-catalog').innerHTML, /Gucci bag/);
  assert.match(element('sell-root').innerHTML, /Your studio, Alex/);
  assert.match(element('sell-root').innerHTML, /<strong>1<small>enquiries/);
  assert.doesNotMatch(element('sell-root').innerHTML, /Open handovers|sample plans|demo\.html/);
  assert.doesNotMatch(element('sell-root').innerHTML, /id="new-listing"|id="sell-form"|demo-reset/);
  assert.deepEqual(errors, []);
});

test('studio inventory search and categories filter only the seller collection', async () => {
  const { run, element, OPULE, listings } = harness();
  const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, listings.slice(0, 2), [], []);
  render('collection');
  render('correspondence');
  element('studio-listing-search').value = 'PRADA';
  await element('studio-listing-search').fire('input');
  assert.match(element('studio-inventory-count').textContent, /1 of 2/);
  assert.match(element('seller-catalog').innerHTML, /Prada Tote/);
  element('studio-category').value = 'Jewelry';
  await element('studio-category').fire('change');
  assert.equal(element('seller-empty').hidden, false);
  assert.equal(element('seller-catalog').innerHTML, '');
  element('studio-listing-search').value = '';
  await element('studio-listing-search').fire('input');
  assert.match(element('seller-catalog').innerHTML, /Diamond ring/);
  assert.equal(element('seller-empty').hidden, true);
  assert.equal(element('studio-message').disabled, true);
  assert.equal(element('studio-send').disabled, true);
});

test('studio mounts sections on demand, shows only one view, and retains drafts and filters', async () => {
  const { element, OPULE, listings, navigate, click } = harness({
    db: { all: async () => [], messagesFor: async () => [] }
  });
  const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, listings,
    [{ id: 'chat', buyerId: 'jamie' }], []);
  OPULE.initStudioNavigation(render);
  const visible = () => ['overview', 'collection', 'correspondence'].filter(name => !element('view-' + name).hidden);
  assert.deepEqual(visible(), ['overview']);
  assert.equal(element('view-collection').innerHTML, '');
  assert.equal(element('view-correspondence').innerHTML, '');
  assert.equal(click('#studio-listings', { ctrlKey: true }), false);
  assert.deepEqual(visible(), ['overview']);
  assert.equal(click('#studio-listings'), true);
  assert.deepEqual(visible(), ['collection']);
  assert.match(element('view-collection').innerHTML, /studio-listing-search/);
  assert.equal(element('view-correspondence').innerHTML, '');
  element('studio-listing-search').value = 'Prada';
  await element('studio-listing-search').fire('input');
  click('#studio-handovers');
  assert.deepEqual(visible(), ['correspondence']);
  element('studio-message').value = 'Keep my draft';
  await element('studio-message').fire('input');
  navigate('#sell-root');
  assert.deepEqual(visible(), ['overview']);
  navigate('#studio-listings');
  assert.equal(element('studio-listing-search').value, 'Prada');
  assert.match(element('studio-inventory-count').textContent, /1 of 3/);
  navigate('#studio-enquiries');
  assert.equal(element('studio-message').value, 'Keep my draft');
  navigate('#unknown');
  assert.deepEqual(visible(), ['overview']);
});

test('studio deep links mount only the requested section initially', async () => {
  for (const [hash, view] of [['#studio-listings', 'collection'], ['#studio-handovers', 'correspondence']]) {
    const { element, OPULE, location } = harness({ db: { all: async () => [] } });
    const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, [], [], []);
    location.hash = hash;
    OPULE.initStudioNavigation(render);
    assert.equal(element('view-' + view).hidden, false);
    assert.notEqual(element('view-' + view).innerHTML, '');
    assert.equal(element('view-' + (view === 'collection' ? 'correspondence' : 'collection')).innerHTML, '');
    assert.equal(element('view-overview').hidden, true);
  }
});

test('studio reply failure preserves drafts and successful sends prevent duplicate submissions', async () => {
  let release;
  let calls = 0;
  let fail = true;
  const errors = [];
  const { element, OPULE, listings } = harness({
    db: {
      all: async () => [{ id: 'jamie', name: 'Jamie', initials: 'JR', area: 'Baliwag', transactions: 8 }],
      messagesFor: async () => [],
      report: error => errors.push(error),
      sendMessage: async (id, sender, text) => {
        calls++;
        if (fail) throw new Error('Offline');
        await new Promise(resolve => { release = resolve; });
        return { id: 'reply', senderId: sender, text, createdAt: '2026-11-10' };
      }
    }
  });
  const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, listings, [{ id: 'chat', buyerId: 'jamie', listingId: 'ring' }], []);
  render('correspondence');
  element('studio-message').value = '<A literal reply>';
  await element('studio-message').fire('input');
  await element('studio-compose').fire('submit');
  assert.equal(element('studio-message').value, '<A literal reply>');
  assert.match(element('studio-message-status').textContent, /Reply not sent/);
  assert.equal(errors.length, 1);
  fail = false;
  const pending = element('studio-compose').fire('submit');
  await element('studio-compose').fire('submit');
  assert.equal(calls, 2);
  assert.equal(element('studio-send').disabled, true);
  release();
  await pending;
  assert.equal(element('studio-chat').children[0].textContent, '<A literal reply>');
  assert.equal(element('studio-message').value, '');
  assert.equal(element('studio-send').disabled, false);
  assert.match(element('studio-message-status').textContent, /Reply sent/);
});

test('website sample studio keeps messaging and piece links without a phone simulation', async () => {
  const { element, OPULE, listings } = harness({
    db: { all: async () => [{ id: 'jamie', name: 'Jamie' }], messagesFor: async () => [] }
  });
  const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, listings,
    [{ id: 'chat', buyerId: 'jamie', listingId: 'one & two' }]);
  render('correspondence');
  assert.match(element('studio-chat-heading').innerHTML, /listing\.html\?id=one%20%26%20two/);
  assert.doesNotMatch(element('view-correspondence').innerHTML, /demo\.html|studio-plans|Appointments/);
});

test('signed-in buyers open the collection and website messages instead of the phone', async () => {
  for (const demo of [false, true]) {
    const { run, element, errors } = harness({ getUser: () => ({ id: 'jamie', name: 'Jamie', role: 'buyer', demo }) });
    await run('index-page');
    assert.equal(element('buyer-view-browse').hidden, false);
    assert.equal(element('ledger').children.length, 3);
    assert.equal(element('buyer-chat').href, 'inbox.html');
    assert.deepEqual(errors, []);
  }
});

test('studio navigation tracks section hashes and history without activating hidden links', () => {
  const properties = {};
  const nav = {
    style: { setProperty: (name, value) => { properties[name] = value; } },
    classList: { add() {} }, addEventListener() {},
    querySelectorAll: () => links, querySelector: () => links.find(link => link.attributes?.['aria-current'])
  };
  const root = { querySelectorAll: () => [], addEventListener() {} };
  const links = ['#sell-root', '#studio-listings', '#studio-enquiries'].map((href, index) => ({
    parentElement: nav, offsetLeft: 0, offsetTop: 12 + index * 76, offsetWidth: 222, offsetHeight: 68,
    href, attributes: {}, getAttribute(name) { return name === 'href' ? this.href : this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute(name) { delete this.attributes[name]; }
  }));
  links.push({ hidden: true });
  const events = {};
  const location = { hash: '#studio-listings' };
  const OPULE = { esc: String };
  const context = {
    OPULE, location, document: { querySelector: () => nav, querySelectorAll: () => [], getElementById: () => root },
    MutationObserver: class { observe() {} },
    window: { addEventListener: (name, callback) => { events[name] = callback; } }
  };
  runInNewContext(readFileSync(new URL('../../assets/navigation.js', import.meta.url), 'utf8'), context);
  runInNewContext(readFileSync(new URL('../../assets/seller-studio.js', import.meta.url), 'utf8'), context);
  OPULE.initStudioNavigation();
  assert.equal(links[1].attributes['aria-current'], 'location');
  assert.equal(properties['--nav-y'], '88px');
  assert.equal(properties['--nav-height'], '68px');
  location.hash = '#studio-handovers';
  events.hashchange();
  assert.equal(links[2].attributes['aria-current'], 'location');
  assert.equal(properties['--nav-y'], '164px');
  assert.equal(links[1].attributes['aria-current'], undefined);
  location.hash = '';
  events.hashchange();
  assert.equal(links[0].attributes['aria-current'], 'location');
  assert.equal(links[2].attributes['aria-current'], undefined);
  links[0].offsetLeft = 8;
  links[0].offsetTop = 0;
  links[0].offsetWidth = 86;
  links[0].offsetHeight = 60;
  events.resize();
  assert.equal(properties['--nav-x'], '8px');
  assert.equal(properties['--nav-y'], '0px');
  assert.equal(properties['--nav-width'], '86px');
  assert.equal(properties['--nav-height'], '60px');
});

test('studio preserves each draft and ignores late refreshes from a previous selection', async () => {
  const { element, OPULE } = harness({
    db: {
      all: async () => [{ id: 'one', name: 'One', initials: 'ON' }, { id: 'two', name: 'Two', initials: 'TW' }],
      messagesFor: async () => [],
      report: error => { throw error; }
    }
  });
  const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, [],
    [{ id: 'first', buyerId: 'one' }, { id: 'second', buyerId: 'two' }], []);
  render('correspondence');
  const releases = {};
  OPULE.db.messagesFor = id => new Promise(resolve => { releases[id] = resolve; });
  element('studio-message').value = 'First draft';
  await element('studio-message').fire('input');
  const click = id => element('studio-threads').listeners.click({ target: { closest: () => ({ dataset: { thread: id } }) } });
  const second = click('second');
  const first = click('first');
  releases.first([{ text: 'First conversation', senderId: 'one' }]);
  await first;
  releases.second([{ text: 'Second conversation', senderId: 'two' }]);
  await second;
  assert.equal(element('studio-message').value, 'First draft');
  assert.match(element('studio-chat-heading').innerHTML, /<strong>One/);
  assert.equal(element('studio-chat').children[0].textContent, 'First conversation');
  assert.equal(element('studio-send').disabled, false);
});

test('studio refresh errors retain the conversation and draft and allow retry', async () => {
  const errors = [];
  const { element, OPULE } = harness({
    db: {
      all: async () => [],
      messagesFor: async () => [{ text: 'Existing message', senderId: 'buyer', createdAt: '2026-11-10' }],
      report: error => errors.push(error)
    }
  });
  const render = await OPULE.renderSampleStudio(element('sell-root'), { id: 'alex', name: 'Alex' }, [], [{ id: 'chat', buyerId: 'buyer' }], []);
  render('correspondence');
  element('studio-message').value = '   ';
  await element('studio-compose').fire('submit');
  assert.equal(element('studio-message-status').textContent, 'Write a message before sending.');
  element('studio-message').value = 'Keep this draft';
  await element('studio-message').fire('input');
  OPULE.db.messagesFor = async () => { throw new Error('Offline'); };
  await element('studio-refresh').fire('click');
  assert.equal(errors.length, 1);
  assert.match(element('studio-message-status').textContent, /Could not refresh/);
  assert.equal(element('studio-message').value, 'Keep this draft');
  assert.equal(element('studio-chat').children[0].textContent, 'Existing message');
  assert.equal(element('studio-refresh').disabled, false);
});

test('studio preserves anonymous, buyer, applicant, pending, and verified seller paths', async () => {
  const states = [
    { user: null, seller: null, expected: /Sign in to sell/ },
    { user: { role: 'buyer' }, seller: null, expected: /signed in as a buyer/ },
    { user: { role: 'seller' }, seller: null, expected: /Start the application/ },
    { user: { role: 'seller' }, seller: { status: 'pending', name: 'Alex S.', appliedAt: '2026-01-01', callSlot: 'Morning', idType: 'Passport' }, expected: /Under review/ },
    { user: { id: 'real', name: 'Real S.', role: 'seller' }, seller: { status: 'verified' }, expected: /id="new-listing"/ }
  ];
  for (const state of states) {
    const { run, element, errors, navigate } = harness({ getUser: () => state.user, getSeller: () => state.seller });
    await run('sell-page');
    assert.match(element('sell-root').innerHTML, state.expected);
    if (state.seller?.status === 'verified') {
      assert.equal(element('new-listing').innerHTML, '');
      navigate('#new-listing');
      assert.match(element('new-listing').innerHTML, /id="sell-form"/);
    }
    assert.deepEqual(errors, []);
  }
});

test('real seller publishing updates inventory and rejects fractional or out-of-range prices', async () => {
  const published = [];
  const { run, element, errors, navigate } = harness({
    getUser: () => ({ id: 'real', name: 'Real S.', role: 'seller' }),
    getSeller: () => ({ status: 'verified', area: 'baliwag' }),
    addListing: async listing => { published.push(listing); return { ...listing, id: 'new & item' }; }
  });

  await run('sell-page');
  navigate('#studio-listings');
  element('sell-form').reset = () => {};
  element('f-title').value = 'New watch';
  element('f-area').value = 'baliwag';
  element('f-category').value = 'Watches';
  element('f-condition').value = 'Excellent';
  for (const value of ['999', '1500.5', '100000001']) {
    element('f-price').value = value;
    await element('sell-form').fire('submit');
    assert.equal(published.length, 0);
    assert.equal(element('f-error').style.display, 'block');
  }
  element('f-price').value = '185000';
  await element('sell-form').fire('submit');
  assert.equal(published.length, 1);
  assert.equal(published[0].price, 185000);
  assert.equal(element('seller-catalog').children.length, 1);
  assert.equal(element('seller-empty').hidden, true);
  assert.equal(element('publish-listing').disabled, false);
  assert.match(element('listed-note').innerHTML, /new%20%26%20item/);
  assert.deepEqual(errors, []);
});

test('review simulation is offered only for local development accounts', async () => {
  for (const localDemoEnabled of [false, true]) {
    const { run, element } = harness({
      localDemoEnabled,
      getUser: () => ({ id: 'real', name: 'Real S.', role: 'seller' }),
      getSeller: () => ({ status: 'pending', name: 'Real S.', appliedAt: '2026-01-01', callSlot: 'Morning', idType: 'Passport' })
    });
    await run('sell-page');
    assert.equal(element('sell-root').innerHTML.includes('demo-approve'), localDemoEnabled);
  }
});

test('failed bootstrap clears loading placeholders and reports an explicit error', async () => {
  for (const name of ['index-page', 'sell-page']) {
    const failure = new Error('Database unavailable');
    const { run, element, errors } = harness({ ready: Promise.reject(failure) });
    await run(name);
    assert.equal(errors[0], failure);
    if (name === 'index-page') {
      assert.equal(element('ledger').attributes['aria-busy'], 'false');
      assert.match(element('listing-count').textContent, /unavailable/);
    } else assert.match(element('sell-root').textContent, /could not be loaded/);
  }
});
