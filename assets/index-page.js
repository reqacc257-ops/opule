(async function () {
  await OPULE.ready;
  var listings = OPULE.getListings();
  var rows = listings.map(function (l) {
    var area = OPULE.areaById(l.area);
    return '<a class="row" href="listing.html?id=' + encodeURIComponent(l.id) + '">' +
      '<span class="product-photo"><img class="ph" src="' + OPULE.esc(l.image || '') + '" alt="Illustrative stock photo, not the exact ' + OPULE.esc(l.title) + '" loading="lazy"><span class="photo-badge">Stock photo</span></span>' +
      '<span class="t"><h3>' + OPULE.esc(l.title) + '</h3><p>' + OPULE.esc(l.meta || '') + '</p></span>' +
      '<span class="meta">' + (l.sample ? 'Test area · ' : 'Seller verified · ') + (area ? OPULE.esc(area.name) : '') + '</span>' +
      '<span class="meta">' + OPULE.esc(l.category || '') + '</span>' +
      '<span class="price serif">' + OPULE.peso(l.price) + '</span>' +
      '</a>';
  }).join('');
  document.getElementById('ledger').innerHTML = rows;
  document.getElementById('ledger').setAttribute('aria-busy', 'false');
  document.getElementById('listing-count').textContent = listings.length + ' items';
})().catch(OPULE.db.report);
