(async function () {
  'use strict';
  var compact = matchMedia('(max-width: 760px)');
  document.getElementById('market-refine').open = !compact.matches;
  compact.addEventListener('change', function (event) { document.getElementById('market-refine').open = !event.matches; });
  await OPULE.ready;
  var listings = OPULE.getListings();
  var ledger = document.getElementById('ledger');
  var search = document.getElementById('market-search');
  var area = document.getElementById('market-area');
  var price = document.getElementById('market-price');
  var sort = document.getElementById('market-sort');
  var filters = document.getElementById('market-filters');
  var empty = document.getElementById('market-empty');
  var rendered = false;
  OPULE.AREAS.forEach(function (item) {
    var option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    area.appendChild(option);
  });
  var user = OPULE.getUser();
  if (user) document.getElementById('market-account').textContent = user.name;
  if (user && user.demo && OPULE.demoEnabled) {
    document.getElementById('buyer-chat').href = 'demo.html?account=' + (user.role === 'seller' ? 'alex' : 'jamie') + '&live=1';
  } else if (user) {
    document.getElementById('buyer-chat').href = 'inbox.html';
    document.getElementById('buyer-chat').textContent = 'Your messages';
  }
  function render() {
    var query = search.value.trim().toLocaleLowerCase();
    var category = filters.querySelector('input[name="category"]:checked').value;
    var maxPrice = price.value === '' ? Infinity : Number(price.value);
    var results = listings.filter(function (listing) {
      return (!listing.status || listing.status === 'active') && (!query || [listing.title, listing.category, listing.meta].join(' ').toLocaleLowerCase().includes(query)) &&
        (!category || listing.category === category) && (!area.value || listing.area === area.value) &&
        listing.price <= maxPrice;
    });
    if (sort.value === 'price-low') results.sort(function (a, b) { return a.price - b.price; });
    if (sort.value === 'price-high') results.sort(function (a, b) { return b.price - a.price; });
    if (sort.value === 'title') results.sort(function (a, b) { return a.title.localeCompare(b.title); });
    var fragment = document.createDocumentFragment();
    results.forEach(function (listing) { fragment.appendChild(OPULE.listingCard(listing)); });
    ledger.replaceChildren(fragment);
    ledger.setAttribute('aria-busy', 'false');
    empty.hidden = results.length !== 0;
    document.getElementById('listing-count').textContent = results.length + ' of ' + listings.length + ' pieces';
    rendered = true;
  }
  search.addEventListener('input', render);
  price.addEventListener('input', render);
  filters.addEventListener('change', render);
  sort.addEventListener('change', render);
  filters.addEventListener('reset', function () {
    search.value = '';
    sort.value = 'curated';
    requestAnimationFrame(render);
  });
  document.getElementById('empty-reset').addEventListener('click', function () { filters.reset(); });
  OPULE.initPageNavigation({
    root: document.getElementById('buyer-root'), nav: document.querySelector('[aria-label="Buyer navigation"]'),
    defaultHash: '#edit', routes: { '#edit': 'edit', '#browse': 'browse', '#collection-selection': 'browse', '#how': 'approach' },
    renderView: function (view) { if (view === 'browse' && !rendered) render(); },
    onChange: function (view) { document.getElementById('buyer-refinements').hidden = view !== 'browse'; }
  });
})().catch(function (error) {
  document.getElementById('ledger').replaceChildren();
  document.getElementById('ledger').setAttribute('aria-busy', 'false');
  document.getElementById('listing-count').textContent = 'Collection unavailable. Please refresh to try again.';
  OPULE.db.report(error);
});
