(function () {
  'use strict';
  var data = OPULE.discovery;
  var el = function (id) { return document.getElementById(id); };
  var pageSize = 12, page = 1, savedPage = 1, storePage = 1, storePageSize = 6;
  var sourceStores = data.stores.filter(function (store) { return data.items.some(function (item) { return item.storeId === store.id; }); });
  var spotlight = data.selectSpotlight(Math.random());
  var saved = new Set();
  var key = 'opule_discovery_saved';
  function notify(message) { el('discovery-status').textContent = message; }
  try {
    var stored = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(stored) || stored.some(function (id) { return typeof id !== 'string'; })) throw new Error('Invalid shortlist data');
    saved = new Set(stored.filter(function (id) { return data.items.some(function (item) { return item.id === id; }); }));
  } catch (error) {
    console.error('Unable to load shortlist:', error);
    notify('Your saved shortlist could not be read. You can still browse; saving again will replace the unreadable shortlist.');
  }
  function options(id, values) {
    values.forEach(function (value) {
      var option = document.createElement('option');
      option.value = typeof value === 'string' ? value : value.id;
      option.textContent = typeof value === 'string' ? value : value.name;
      el(id).appendChild(option);
    });
  }
  options('discover-brand', Array.from(new Set(data.items.map(function (item) { return item.brand; }))).sort());
  options('discover-category', Array.from(new Set(data.items.map(function (item) { return item.category; }))).sort());
  options('discover-store', sourceStores);
  options('discover-currency', Array.from(new Set(data.items.map(function (item) { return item.currency; }))).sort());
  var philippineItems = data.items.filter(function (item) { return item.madeIn === 'Philippines'; });
  el('discovery-stats').textContent = data.items.length + ' product references from ' + sourceStores.length + ' stores / ' + data.stores.length + ' stores to explore / ' +
    new Set(data.items.map(function (item) { return item.brand; })).size + ' designers';
  function filters() {
    return { query: el('discover-search').value, category: el('discover-category').value, brand: el('discover-brand').value,
      store: el('discover-store').value, region: el('discover-region').value, madeIn: el('discover-origin').value, currency: el('discover-currency').value,
      maxPrice: el('discover-price').value, sort: el('discovery-sort').value };
  }
  function text(tag, value, className) {
    var node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function card(item) {
    var store = data.stores.find(function (entry) { return entry.id === item.storeId; });
    var article = document.createElement('article');
    article.className = 'discovery-card';
    var art = document.createElement('a');
    art.className = 'discovery-art';
    art.href = item.url;
    art.rel = 'noopener noreferrer';
    art.setAttribute('aria-label', 'View photos of ' + item.brand + ' ' + item.title + ' at ' + store.name);
    var image = document.createElement('img');
    image.alt = item.brand + ' ' + item.title + ' - photo from ' + store.name;
    image.width = 600;
    image.height = 600;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    var photoStatus = text('span', 'Loading store photo...');
    image.addEventListener('load', function () { photoStatus.hidden = true; });
    image.addEventListener('error', function () {
      image.hidden = true;
      photoStatus.hidden = false;
      photoStatus.textContent = 'Photo unavailable. View photos at store.';
      console.warn('Store photo unavailable:', item.id);
    });
    image.src = item.image;
    art.append(image, photoStatus);
    var copy = document.createElement('div');
    copy.className = 'discovery-card-copy';
    copy.append(text('p', store.name + ' / ' + store.region, 'cap'), text('h3', item.brand + ' ' + item.title));
    if (item.madeIn) {
      var origin = text('a', 'Made in ' + item.madeIn + ' / brand-stated', 'origin-label');
      origin.href = item.originEvidence;
      origin.rel = 'noopener noreferrer';
      origin.setAttribute('aria-label', 'Read ' + store.name + "'s Philippine production statement");
      copy.appendChild(origin);
    }
    copy.appendChild(text('small', 'Photo: ' + store.name));
    copy.appendChild(text('p', item.price === null ? 'See price at store' :
      new Intl.NumberFormat('en', { style: 'currency', currency: item.currency, maximumFractionDigits: 0 }).format(item.price) + ' ' + item.currency, 'source-price'));
    copy.appendChild(text('small', 'Reference price, not a live offer. Availability unconfirmed.'));
    copy.appendChild(text('small', item.evidence + ' / ' + item.observed, 'reference-note'));
    var actions = document.createElement('div');
    actions.className = 'discovery-actions';
    var visit = text('a', 'View at store', 'btn fill');
    visit.href = item.url;
    visit.rel = 'noopener noreferrer';
    visit.setAttribute('aria-label', 'View ' + item.brand + ' ' + item.title + ' at ' + store.name);
    var save = text('button', saved.has(item.id) ? 'Saved' : 'Save', 'btn quiet');
    save.type = 'button';
    save.dataset.saveId = item.id;
    save.setAttribute('aria-pressed', String(saved.has(item.id)));
    save.setAttribute('aria-label', 'Save ' + item.brand + ' ' + item.title);
    save.addEventListener('click', function () {
      var next = new Set(saved);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      try { localStorage.setItem(key, JSON.stringify(Array.from(next))); }
      catch (error) {
        console.error('Unable to save shortlist:', error);
        notify('Your browser could not save this piece. Allow site storage and try again.');
        return;
      }
      saved = next;
      document.querySelectorAll('[data-save-id]').forEach(function (button) {
        var active = saved.has(button.dataset.saveId);
        button.textContent = active ? 'Saved' : 'Save';
        button.setAttribute('aria-pressed', String(active));
      });
      renderSaved();
      notify(next.has(item.id) ? 'Piece saved to your shortlist in this browser.' : 'Piece removed from your shortlist.');
      if (location.hash === '#saved') {
        var remaining = el('saved-grid').querySelector('button');
        if (remaining) remaining.focus({ preventScroll: true });
        else el('saved-empty').querySelector('a').focus({ preventScroll: true });
      }
    });
    actions.append(visit, save);
    copy.appendChild(actions);
    article.append(art, copy);
    return article;
  }
  function renderFeaturedPhilippineItems() {
    var featuredIds = ['aranaz:flordeliza-black-copy', 'r2r:sili-bag', 'aranaz:lagrima-kubo-medium'];
    var fragment = document.createDocumentFragment();
    featuredIds.forEach(function (id) {
      var item = philippineItems.find(function (entry) { return entry.id === id; });
      if (!item) return;
      var store = data.stores.find(function (entry) { return entry.id === item.storeId; });
      var article = document.createElement('article');
      article.className = 'featured-ph-card';
      var link = text('a', '', 'featured-ph-art');
      link.href = item.url;
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'View ' + item.brand + ' ' + item.title + ' at ' + store.name);
      var image = document.createElement('img');
      image.src = item.image;
      image.alt = item.brand + ' ' + item.title + ', photo from ' + store.name;
      image.width = 480;
      image.height = 480;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      link.appendChild(image);
      var details = document.createElement('div');
      details.className = 'featured-ph-copy';
      details.append(text('p', store.name, 'cap'), text('h3', item.title));
      details.appendChild(text('p', new Intl.NumberFormat('en', { style: 'currency', currency: item.currency, maximumFractionDigits: 0 }).format(item.price) + ' ' + item.currency + ' / reference price', 'featured-ph-price'));
      var origin = text('a', 'Made in Philippines / brand-stated', 'origin-label');
      origin.href = item.originEvidence;
      origin.rel = 'noopener noreferrer';
      origin.setAttribute('aria-label', 'Read ' + store.name + "'s Philippine production statement");
      details.appendChild(origin);
      article.append(link, details);
      fragment.appendChild(article);
    });
    el('featured-ph-grid').replaceChildren(fragment);
  }
  function renderCards(root, items) {
    var fragment = document.createDocumentFragment();
    items.forEach(function (item) { fragment.appendChild(card(item)); });
    root.replaceChildren(fragment);
  }
  function render() {
    var results = data.filterItems(filters());
    var total = Math.max(1, Math.ceil(results.length / pageSize));
    page = Math.min(page, total);
    renderCards(el('discovery-grid'), results.slice((page - 1) * pageSize, page * pageSize));
    el('listing-count').textContent = results.length + ' of ' + data.items.length + ' product references';
    el('discovery-empty').hidden = results.length !== 0;
    el('page-status').textContent = 'Page ' + page + ' of ' + total;
    el('previous-page').disabled = page === 1;
    el('next-page').disabled = page === total;
  }
  function renderSaved() {
    var items = data.items.filter(function (item) { return saved.has(item.id); });
    var total = Math.max(1, Math.ceil(items.length / pageSize));
    savedPage = Math.min(savedPage, total);
    renderCards(el('saved-grid'), items.slice((savedPage - 1) * pageSize, savedPage * pageSize));
    el('saved-count').textContent = items.length;
    el('saved-empty').hidden = items.length !== 0;
    el('saved-page-status').textContent = 'Page ' + savedPage + ' of ' + total;
    el('saved-previous').disabled = savedPage === 1;
    el('saved-next').disabled = savedPage === total;
  }
  function priceControls() {
    var enabled = !!el('discover-currency').value;
    el('discover-price').disabled = !enabled;
    el('discover-price').placeholder = enabled ? 'No limit' : 'Choose a currency first';
    el('discovery-sort').querySelectorAll('option[value^="price-"]').forEach(function (option) { option.disabled = !enabled; });
    if (!enabled) {
      el('discover-price').value = '';
      if (el('discovery-sort').value.indexOf('price-') === 0) el('discovery-sort').value = 'curated';
    }
  }
  function update() { priceControls(); page = 1; render(); }
  el('browse-spotlight').addEventListener('click', function () {
    el('discovery-filters').reset();
    el('discover-store').value = spotlight.id;
    update();
    el('discovery-grid').tabIndex = -1;
    el('discovery-grid').focus({ preventScroll: true });
    el('discovery-grid').scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  el('browse-ph').addEventListener('click', function () {
    el('discovery-filters').reset();
    el('discover-origin').value = 'Philippines';
    update();
    el('discovery-grid').scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  el('browse-all').addEventListener('click', function () {
    el('discovery-filters').reset();
    update();
    el('discovery-grid').scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  el('discovery-filters').addEventListener('input', update);
  el('discovery-filters').addEventListener('change', update);
  el('discovery-sort').addEventListener('change', update);
  el('discovery-filters').addEventListener('reset', function () {
    el('discovery-sort').value = 'curated';
    requestAnimationFrame(update);
  });
  el('clear-search').addEventListener('click', function () { el('discovery-filters').reset(); });
  [['previous-page', -1], ['next-page', 1], ['saved-previous', -1], ['saved-next', 1]].forEach(function (entry) {
    el(entry[0]).addEventListener('click', function () {
      var isSaved = entry[0].indexOf('saved-') === 0;
      if (isSaved) { savedPage += entry[1]; renderSaved(); } else { page += entry[1]; render(); }
      var grid = el(isSaved ? 'saved-grid' : 'discovery-grid');
      grid.tabIndex = -1;
      grid.focus({ preventScroll: true });
      grid.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  });
  function renderStores() {
    var query = el('store-search').value.trim().toLocaleLowerCase();
    var results = data.stores.filter(function (store) {
      return (!query || [store.name, store.note].join(' ').toLocaleLowerCase().includes(query)) &&
        (!el('store-region').value || store.region === el('store-region').value) &&
        (!el('store-coverage').value || (sourceStores.includes(store) ? 'imported' : 'directory') === el('store-coverage').value);
    });
    var total = Math.max(1, Math.ceil(results.length / storePageSize));
    storePage = Math.min(storePage, total);
    el('store-count').textContent = results.length + ' of ' + data.stores.length + ' independent stores';
    el('store-empty').hidden = results.length !== 0;
    el('store-page-status').textContent = 'Page ' + storePage + ' of ' + total;
    el('store-previous').disabled = storePage === 1;
    el('store-next').disabled = storePage === total;
    el('store-directory').replaceChildren();
    results.slice((storePage - 1) * storePageSize, storePage * storePageSize).forEach(function (store) {
      var article = document.createElement('article');
      var count = data.items.filter(function (item) { return item.storeId === store.id; }).length;
      article.append(text('p', store.region, 'cap'), text('h3', store.name), text('p', store.note),
        text('p', count ? count + ' product references in our edit' : 'Directory only — products not imported yet'),
        text('small', 'Website reviewed ' + store.reviewed + '. Check delivery and returns directly.'));
      if (count) {
        var browse = text('a', 'Explore its ' + count + ' pieces', 'btn');
        browse.href = '#browse';
        browse.addEventListener('click', function () {
          el('discovery-filters').reset();
          el('discover-store').value = store.id;
          update();
        });
        article.appendChild(browse);
      }
      var visit = text('a', 'Visit store', 'btn quiet');
      visit.href = store.url;
      visit.rel = 'noopener noreferrer';
      article.appendChild(visit);
      el('store-directory').appendChild(article);
    });
  }
  function updateStores() { storePage = 1; renderStores(); }
  el('store-filters').addEventListener('input', updateStores);
  el('store-filters').addEventListener('change', updateStores);
  el('store-filters').addEventListener('reset', function () { requestAnimationFrame(updateStores); });
  el('store-clear').addEventListener('click', function () { el('store-filters').reset(); });
  [['store-previous', -1], ['store-next', 1]].forEach(function (entry) {
    el(entry[0]).addEventListener('click', function () {
      storePage += entry[1]; renderStores();
      el('store-directory').tabIndex = -1;
      el('store-directory').focus({ preventScroll: true });
      el('store-directory').scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  });
  var compact = matchMedia('(max-width: 760px)');
  el('market-refine').open = !compact.matches;
  compact.addEventListener('change', function (event) { el('market-refine').open = !event.matches; });
  render(); renderSaved(); renderStores(); renderFeaturedPhilippineItems();
  var spotlightItems = data.items.filter(function (item) { return item.storeId === spotlight.id; });
  el('spotlight-location').textContent = 'The store spotlight / ' + spotlight.region;
  el('spotlight-title').textContent = spotlight.name + '.';
  el('spotlight-tagline').textContent = spotlight.id === 'gentry' ? 'Time worth discovering.' : 'Independent stores. Distinctive finds.';
  el('spotlight-description').textContent = spotlight.note + (spotlightItems.length ? '' : ' Directory only: products are not imported into our edit yet. Explore the collection on its own website.');
  el('spotlight-visit').href = spotlight.url;
  el('spotlight-visit').textContent = 'Visit ' + spotlight.name;
  el('spotlight-visit').hidden = false;
  el('browse-spotlight').hidden = spotlightItems.length === 0;
  el('spotlight-grid').hidden = spotlightItems.length === 0;
  el('spotlight-grid').setAttribute('aria-label', 'Featured pieces from ' + spotlight.name);
  renderCards(el('spotlight-grid'), spotlightItems.slice(0, 3));
  OPULE.initPageNavigation({
    root: el('buyer-root'), nav: document.querySelector('[aria-label="Buyer navigation"]'),
    defaultHash: '#browse', routes: { '#browse': 'browse', '#collection-selection': 'browse', '#edit': 'browse', '#saved': 'saved', '#stores': 'stores', '#how': 'how' },
    onChange: function (view) { el('buyer-refinements').hidden = view !== 'browse'; }
  });
})();
