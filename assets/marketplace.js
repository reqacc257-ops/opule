(function () {
  'use strict';
  OPULE.listingCard = function (listing) {
    var card = document.createElement('a');
    card.className = 'catalog-card';
    card.href = 'listing.html?id=' + encodeURIComponent(listing.id);
    var photo = document.createElement('div');
    photo.className = 'catalog-photo';
    if (listing.image) {
      var image = document.createElement('img');
      image.src = listing.image;
      image.alt = listing.sample ? 'Illustrative stock photo, not the exact ' + listing.title : listing.title;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 600;
      image.height = 600;
      photo.appendChild(image);
    } else {
      var placeholder = document.createElement('span');
      placeholder.className = 'catalog-no-photo';
      placeholder.textContent = 'Photography pending';
      photo.appendChild(placeholder);
    }
    var badge = document.createElement('span');
    badge.className = 'catalog-badge';
    badge.textContent = listing.sample ? 'Market sample · stock image' : 'Listed piece';
    photo.appendChild(badge);
    var content = document.createElement('div');
    content.className = 'catalog-copy';
    var category = document.createElement('p');
    category.className = 'cap';
    category.textContent = listing.category || 'Collection';
    var price = document.createElement('p');
    price.className = 'catalog-price';
    price.textContent = OPULE.peso(listing.price);
    var title = document.createElement('h3');
    title.textContent = listing.title;
    var area = OPULE.areaById(listing.area);
    var location = document.createElement('p');
    location.className = 'catalog-location';
    location.textContent = (listing.sample ? 'Sample area · ' : '') + (area ? area.name : 'Area not specified');
    content.append(category, price, title, location);
    card.append(photo, content);
    return card;
  };
})();
