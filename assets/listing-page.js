(async function () {
  await OPULE.ready;
  var root = document.getElementById('listing-root');
  var listing = OPULE.getListing(OPULE.qs('id'));

  if (!listing) {
    root.setAttribute('aria-busy', 'false');
    root.innerHTML =
      '<p class="cap">Not found</p>' +
      '<h1 class="display serif" style="margin-top:20px">That listing is gone.</h1>' +
      '<p style="margin-top:20px"><a href="index.html#browse">Back to recently listed</a></p>';
    return;
  }

  root.setAttribute('aria-busy', 'false');
  var sellerArea = OPULE.areaById(listing.area);
  var isSample = !!listing.sample;
  var user = OPULE.getUser();
  var ownListing = user && user.id === listing.sellerId;
  var available = !listing.status || listing.status === 'active';
  var sourceLink = isSample && /^https:\/\/theorangebox\.ph\//.test(listing.sourceUrl || '')
    ? '<p class="market-sample-note">Market reference for testing only — not listed, authenticated, or sold by Opulé. Source: <a href="' +
      OPULE.esc(listing.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' +
      OPULE.esc(listing.sourceName || 'The Orange Box PH') + '</a>. Price and availability may change.</p>'
    : '';
  var imageDimensions = Number.isInteger(listing.imageWidth) && listing.imageWidth > 0 &&
    Number.isInteger(listing.imageHeight) && listing.imageHeight > 0
    ? ' width="' + listing.imageWidth + '" height="' + listing.imageHeight + '"' : '';
  var uploadedImage = !isSample && /^\/api\/listings\/[^/]+\/photo\?v=[A-Za-z0-9%-]+$/.test(listing.image || '');
  var sampleImage = (isSample && /^assets\/images\/[a-z-]+\.jpg$/.test(listing.image || '')) || uploadedImage
    ? '<img class="sample-product-photo" src="' + OPULE.esc(listing.image) +
      '"' + imageDimensions + ' alt="' + (isSample ? 'Illustrative stock photo, not the exact ' : 'Seller-provided photo of ') + OPULE.esc(listing.title) + '">' +
      (uploadedImage ? '<p class="photo-credit">Seller-provided photo. Opulé has not authenticated the piece.</p>' : /^https:\/\/unsplash\.com\/photos\/[A-Za-z0-9-]+$/.test(listing.imageSource || '')
        ? '<p class="photo-credit">Illustrative photo by <a href="' + OPULE.esc(listing.imageSource) +
          '" target="_blank" rel="noopener noreferrer">' + OPULE.esc(listing.imageCredit || 'Unsplash contributor') +
          '</a> via Unsplash. This is not a photo of the sample listing.</p>'
        : '<p class="photo-credit">Illustrative stock photo; not a photo of the sample listing.</p>')
    : '<div class="ph" style="width:100%;height:360px;margin-top:36px"></div>' +
      '<p style="font-size:13px;margin-top:8px;color:var(--ink)">The seller has not uploaded a photo.</p>';

  root.innerHTML =
    sourceLink +
    '<div class="two-col">' +
      '<div class="listing-gallery">' + sampleImage + '</div>' +
      '<div class="listing-information">' +
        '<p class="cap">' + OPULE.esc(listing.category || 'Listing') + '</p>' +
        '<h1 class="display serif listing-title">' + OPULE.esc(listing.title) + '</h1>' +
        '<p class="serif listing-price">' + OPULE.peso(listing.price) + '</p>' +
        '<p class="listing-note">' + (isSample
          ? 'Reference price shown on the source site when sampled; this is not an Opulé offer.'
          : 'Seller asking price. No payment processing, escrow or buyer protection is provided.') + '</p>' +
        (!isSample && !available ? '<p class="listing-notice">' + OPULE.esc(listing.status === 'sold' ? 'This piece has been marked sold.' : 'This piece is archived and hidden from public browsing.') + '</p>' : '') +
        '<p><a class="btn fill" href="#exchange">' + (isSample ? 'About this sample' : ownListing ? 'Manage this piece' : 'Contact the seller') + '</a></p>' +
        '<nav class="view-nav" id="listing-navigation" aria-label="Listing information"><a href="#details" aria-current="location">Piece details</a><a href="#exchange">' + (isSample ? 'Sample information' : 'Contact the seller') + '</a></nav>' +
        '<section data-page-view="details">' +
        '<dl class="facts">' +
          '<dt>Details</dt><dd>' + OPULE.esc(listing.meta || '—') + '</dd>' +
          '<dt>Condition</dt><dd>' + OPULE.esc(listing.condition || '—') + '</dd>' +
          '<dt>' + (isSample ? 'Source' : 'Seller') + '</dt><dd>' + (isSample
            ? OPULE.esc(listing.sourceName || 'External market sample')
            : 'Seller account · identity and item authenticity are not guaranteed') + '</dd>' +
          '<dt>' + (isSample ? 'Test area' : 'Area') + '</dt><dd>' + (sellerArea ? OPULE.esc(sellerArea.name) : '—') +
            (isSample ? ' (simulated for testing)' : ' (general area only — exact address is never shown)') + '</dd>' +
        '</dl></section>' +
        '<section data-page-view="exchange" hidden><div class="panel">' +
          '<div class="head"><span class="cap">Chat before choosing a place</span></div>' +
          '<p>' + (isSample
            ? 'This is a reference piece, not an offer for sale. Use the sample accounts to try website messaging without arranging a real transaction.'
            : 'Agree on the price and meeting intent in chat first, then choose a venue together.') + '</p>' +
          (isSample ? '<a class="btn" href="' + (user && user.demo ? 'inbox.html' : 'auth.html') + '" style="margin-top:24px">Try website messaging</a>' : '') +
        '</div>' +
        (isSample
          ? '<div class="listing-notice">' +
              '<p class="cap" style="margin-bottom:12px">Demo only</p>' +
              '<p>There is no Opulé seller or transaction for this market sample. Do not send payment or arrange a meetup based on this test listing.</p>' +
            '</div>'
          : '<div class="listing-notice">' +
              '<p class="cap" style="margin-bottom:12px">Message the seller</p>' +
              '<p>Discuss condition, photos and price with the seller. Messaging does not verify identities or authenticate items. Payments and real-money handovers are not managed by Opulé.</p>' +
              (ownListing ? '<a class="btn" href="sell.html#studio-listings">Manage your piece</a>' :
                !available ? '<a class="btn" href="inbox.html">Open existing conversations</a>' :
                !user ? '<a class="btn" href="auth.html">Sign in as a buyer to enquire</a>' :
                user.demo || user.role !== 'buyer' ? '<a class="btn" href="auth.html">Use a real buyer account to enquire</a>' :
                '<button id="start-enquiry" class="btn fill" type="button">Message the seller</button><p id="enquiry-status" role="status"></p>') +
            '</div>') + '</section>' +
      '</div>' +
    '</div>';

  OPULE.initPageNavigation({
    root: document.querySelector('.listing-information'), nav: document.getElementById('listing-navigation'),
    scrollTarget: document.getElementById('listing-navigation'),
    defaultHash: '#details', routes: { '#details': 'details', '#exchange': 'exchange' }
  });
  var enquiry = document.getElementById('start-enquiry');
  if (enquiry) enquiry.addEventListener('click', async function () {
    if (enquiry.disabled) return;
    enquiry.disabled = true;
    var status = document.getElementById('enquiry-status');
    status.textContent = 'Opening your conversation…';
    try {
      var conversation = await OPULE.db.api('conversations', 'POST', { listingId: listing.id });
      location.assign('inbox.html?conversation=' + encodeURIComponent(conversation.id));
    } catch (error) {
      status.textContent = error.message + ' Please retry.';
      OPULE.db.report(error);
      enquiry.disabled = false;
    }
  });
})().catch(OPULE.db.report);
