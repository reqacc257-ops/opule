/* Opulé — shared data and helpers (mock, localStorage-backed) */

var OPULE = (function () {
  'use strict';

  /* ---------- general areas (approximate centers) ---------- */

  var AREAS = [
    { id: 'baliwag',      name: 'Baliwag, Bulacan',        lat: 14.954, lng: 120.897 },
    { id: 'pulilan',      name: 'Pulilan, Bulacan',        lat: 14.902, lng: 120.849 },
    { id: 'plaridel',     name: 'Plaridel, Bulacan',       lat: 14.887, lng: 120.857 },
    { id: 'malolos',      name: 'Malolos, Bulacan',        lat: 14.843, lng: 120.811 },
    { id: 'calumpit',     name: 'Calumpit, Bulacan',       lat: 14.916, lng: 120.766 },
    { id: 'sanrafael',    name: 'San Rafael, Bulacan',     lat: 15.022, lng: 120.965 },
    { id: 'sanildefonso', name: 'San Ildefonso, Bulacan',  lat: 15.079, lng: 120.942 },
    { id: 'stamaria',     name: 'Santa Maria, Bulacan',    lat: 14.818, lng: 120.956 },
    { id: 'marilao',      name: 'Marilao, Bulacan',        lat: 14.758, lng: 120.948 },
    { id: 'meycauayan',   name: 'Meycauayan, Bulacan',     lat: 14.737, lng: 120.961 },
    { id: 'valenzuela',   name: 'Valenzuela, Metro Manila',lat: 14.700, lng: 120.983 },
    { id: 'qc',           name: 'Quezon City, Metro Manila', lat: 14.676, lng: 121.043 },
    { id: 'manila',       name: 'Manila, Metro Manila',    lat: 14.599, lng: 120.984 },
    { id: 'makati',       name: 'Makati, Metro Manila',    lat: 14.554, lng: 121.024 }
  ];

  /* Public venue references; coordinates are approximate, not staff-vetted. */

  var SPOTS = [
    { id: 'rich-bistro', name: 'RICH Bistro Baliwag', kind: 'Bistro', area: 'baliwag', lat: 14.95, lng: 120.883,
      address: 'A Square, 3006 Doña Remedios Trinidad Hwy, Pinagbarilan, Baliwag, 3006 Bulacan, Philippines',
      source: 'https://www.google.com/maps/search/?api=1&query=RICH%20Bistro%20Baliwag%20A%20Square',
      sourceLabel: 'Find venue on Maps', preferred: true,
      note: 'Featured bistro supplied for this sample. Coordinates approximate A Square, not the restaurant entrance. Confirm the branch, hours, and a table before meeting.', best: 'Agree on a time with the venue' },
    { id: 'starbucks-drt', name: 'Starbucks DRT Highway Baliuag Drive-Thru', kind: 'Café', area: 'baliwag', lat: 14.9561389, lng: 120.8878321,
      address: 'DRT Highway, Baliwag, Bulacan, Philippines',
      source: 'https://maps.app.goo.gl/HgD3TXEHRUUhVau46', sourceLabel: 'View venue listing',
      googleMaps: 'https://maps.app.goo.gl/HgD3TXEHRUUhVau46',
      note: 'Alternative café from the supplied map link. Meet inside rather than in the drive-thru; confirm hours and seating first.', best: 'During confirmed café hours' }
  ];

  /* ---------- seed listings ---------- */

  var SEED = [
    { id: 'L1', title: 'Hermès Roulis 23 Beton Evercolor GHW', category: 'Bags', price: 282000,
      meta: 'Philippine market sample · demo only', condition: 'See source listing', area: 'makati',
      sample: true, sourceName: 'The Orange Box PH', sourceUrl: 'https://theorangebox.ph/collections/all',
      image: 'assets/images/handbag.jpg', imageWidth: 900, imageHeight: 600, imageCredit: 'Reza Abdollahi',
      imageSource: 'https://unsplash.com/photos/a-unique-colorful-handbag-with-a-golden-handle-NvSa7NfL2bQ' },
    { id: 'L2', title: 'LV PalmSpring PM Monogram', category: 'Bags', price: 83000,
      meta: 'Philippine market sample · demo only', condition: 'See source listing', area: 'qc',
      sample: true, sourceName: 'The Orange Box PH', sourceUrl: 'https://theorangebox.ph/collections/all',
      image: 'assets/images/tote.jpg', imageWidth: 900, imageHeight: 900, imageCredit: 'Remi Eris',
      imageSource: 'https://unsplash.com/photos/a-stylish-tote-bag-with-leather-and-tweed-details-eHK8pGo2Gss' },
    { id: 'L3', title: 'Prada Canapa Denim Tote Bag Blue', category: 'Bags', price: 34000,
      meta: 'Philippine market sample · demo only', condition: 'See source listing', area: 'malolos',
      sample: true, sourceName: 'The Orange Box PH', sourceUrl: 'https://theorangebox.ph/collections/all',
      image: 'assets/images/tote.jpg', imageWidth: 900, imageHeight: 900, imageCredit: 'Remi Eris',
      imageSource: 'https://unsplash.com/photos/a-stylish-tote-bag-with-leather-and-tweed-details-eHK8pGo2Gss' },
    { id: 'L4', title: 'Round Brilliant Diamond Ring, 18K White Gold', category: 'Jewelry', price: 150000,
      meta: 'Philippine market sample · demo only', condition: 'See source listing', area: 'baliwag',
      sample: true, sourceName: 'The Orange Box PH', sourceUrl: 'https://theorangebox.ph/collections/all',
      image: 'assets/images/jewelry.jpg', imageWidth: 900, imageHeight: 600, imageCredit: 'Madeline Liu',
      imageSource: 'https://unsplash.com/photos/gold-watch-and-rings-on-wood-kawHVZA9DXA' },
    { id: 'L5', title: 'Gucci Ophidia GG Supreme Vanity Bag', category: 'Bags', price: 73000,
      meta: 'Philippine market sample · demo only', condition: 'See source listing', area: 'marilao',
      sample: true, sourceName: 'The Orange Box PH', sourceUrl: 'https://theorangebox.ph/collections/all',
      image: 'assets/images/handbag.jpg', imageWidth: 900, imageHeight: 600, imageCredit: 'Reza Abdollahi',
      imageSource: 'https://unsplash.com/photos/a-unique-colorful-handbag-with-a-golden-handle-NvSa7NfL2bQ' },
    { id: 'L6', title: 'LV Soufflot Monogram Canvas MM GHW Microchip', category: 'Bags', price: 113000,
      meta: 'Philippine market sample · demo only', condition: 'See source listing', area: 'pulilan',
      sample: true, sourceName: 'The Orange Box PH', sourceUrl: 'https://theorangebox.ph/collections/all',
      image: 'assets/images/tote.jpg', imageWidth: 900, imageHeight: 900, imageCredit: 'Remi Eris',
      imageSource: 'https://unsplash.com/photos/a-stylish-tote-bag-with-leather-and-tweed-details-eHK8pGo2Gss' }
  ];

  /* ---------- storage ---------- */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getListings() {
    return SEED.concat(read('opule_listings', []));
  }
  function addListing(listing) {
    var mine = read('opule_listings', []);
    listing.id = 'U' + Date.now();
    listing.mine = true;
    mine.push(listing);
    write('opule_listings', mine);
    return listing;
  }
  function getListing(id) {
    var all = getListings();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function getSeller() { return read('opule_seller', null); }
  function setSeller(s) { write('opule_seller', s); }
  function clearSeller() { localStorage.removeItem('opule_seller'); }

  function getBuyerArea() { return read('opule_buyer_area', ''); }
  function setBuyerArea(id) { write('opule_buyer_area', id); }

  /* ---------- geo ---------- */

  function areaById(id) {
    for (var i = 0; i < AREAS.length; i++) if (AREAS[i].id === id) return AREAS[i];
    return null;
  }

  function km(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  /* Only return venues within 8 km of the selected buyer area's center.
     Feature the selected bistro first, then sort by proximity. */
  function suggestSpots(buyerAreaId, sellerAreaId, count) {
    var A = areaById(buyerAreaId), B = areaById(sellerAreaId);
    if (!A || !B) return [];
    var scored = SPOTS.map(function (s) {
      var dBuyer = km(A, s), dSeller = km(B, s);
      return {
        spot: s,
        dBuyer: dBuyer,
        dSeller: dSeller,
        score: dBuyer
      };
    });
    scored = scored.filter(function (p) { return p.dBuyer <= 8; });
    scored.sort(function (x, y) { return Number(!!y.spot.preferred) - Number(!!x.spot.preferred) || x.score - y.score || x.dSeller - y.dSeller; });
    return scored.slice(0, count || 3);
  }

  /* ---------- formatting ---------- */

  function peso(n) { return '\u20B1' + Number(n).toLocaleString('en-PH'); }

  function fmtDate(d) {
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function areaOptions(selectedId) {
    return AREAS.map(function (a) {
      var sel = a.id === selectedId ? ' selected' : '';
      return '<option value="' + a.id + '"' + sel + '>' + a.name + '</option>';
    }).join('');
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  return {
    AREAS: AREAS, SPOTS: SPOTS,
    SEED: SEED,
    getListings: getListings, addListing: addListing, getListing: getListing,
    getSeller: getSeller, setSeller: setSeller, clearSeller: clearSeller,
    getBuyerArea: getBuyerArea, setBuyerArea: setBuyerArea,
    areaById: areaById, suggestSpots: suggestSpots,
    peso: peso, fmtDate: fmtDate, qs: qs, areaOptions: areaOptions, esc: esc
  };
})();
