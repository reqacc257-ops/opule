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
  var sourceLink = isSample && /^https:\/\/theorangebox\.ph\//.test(listing.sourceUrl || '')
    ? '<p class="market-sample-note">Market reference for testing only — not listed, authenticated, or sold by Opulé. Source: <a href="' +
      OPULE.esc(listing.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' +
      OPULE.esc(listing.sourceName || 'The Orange Box PH') + '</a>. Price and availability may change.</p>'
    : '';
  var imageDimensions = Number.isInteger(listing.imageWidth) && listing.imageWidth > 0 &&
    Number.isInteger(listing.imageHeight) && listing.imageHeight > 0
    ? ' width="' + listing.imageWidth + '" height="' + listing.imageHeight + '"' : '';
  var sampleImage = isSample && /^assets\/images\/[a-z-]+\.jpg$/.test(listing.image || '')
    ? '<img class="sample-product-photo" src="' + OPULE.esc(listing.image) +
      '"' + imageDimensions + ' alt="Illustrative stock photo, not the exact ' + OPULE.esc(listing.title) + '">' +
      (/^https:\/\/unsplash\.com\/photos\/[A-Za-z0-9-]+$/.test(listing.imageSource || '')
        ? '<p class="photo-credit">Illustrative photo by <a href="' + OPULE.esc(listing.imageSource) +
          '" target="_blank" rel="noopener noreferrer">' + OPULE.esc(listing.imageCredit || 'Unsplash contributor') +
          '</a> via Unsplash. This is not a photo of the sample listing.</p>'
        : '<p class="photo-credit">Illustrative stock photo; not a photo of the sample listing.</p>')
    : '<div class="ph" style="width:100%;height:360px;margin-top:36px"></div>' +
      '<p style="font-size:13px;margin-top:8px;color:var(--ink)">Photos appear after staff review. (Mock: none yet.)</p>';

  root.innerHTML =
    sourceLink +
    '<div class="two-col">' +
      '<div>' +
        '<p class="cap">' + OPULE.esc(listing.category || 'Listing') + '</p>' +
        '<h1 class="display serif listing-title">' + OPULE.esc(listing.title) + '</h1>' +
        '<p class="serif listing-price">' + OPULE.peso(listing.price) + '</p>' +
        '<p class="listing-note">' + (isSample
          ? 'Reference price shown on the source site when sampled; this is not an Opulé offer.'
          : 'Listed price. Held in escrow until you both confirm the handover.') + '</p>' +
        '<div style="margin-top:36px">' + sampleImage + '</div>' +
        '<hr class="rule" style="margin-top:36px">' +
        '<dl class="facts">' +
          '<dt>Details</dt><dd>' + OPULE.esc(listing.meta || '—') + '</dd>' +
          '<dt>Condition</dt><dd>' + OPULE.esc(listing.condition || '—') + '</dd>' +
          '<dt>' + (isSample ? 'Source' : 'Seller') + '</dt><dd>' + (isSample
            ? OPULE.esc(listing.sourceName || 'External market sample')
            : 'ID checked · video verified') + '</dd>' +
          '<dt>' + (isSample ? 'Test area' : 'Area') + '</dt><dd>' + (sellerArea ? OPULE.esc(sellerArea.name) : '—') +
            (isSample ? ' (simulated for testing)' : ' (general area only — exact address is never shown)') + '</dd>' +
        '</dl>' +
      '</div>' +
      '<div>' +
        '<div class="panel">' +
          '<div class="head"><span class="cap">Chat before choosing a place</span></div>' +
          '<p>' + (isSample
            ? 'Buyers open a messaging-style chat; sellers can filter sample buyers by transaction history, approximate distance, and verification. Agree on the price and meeting intent first, then choose an Opulé suggestion or propose your own public venue.'
            : 'Agree on the price and meeting intent in chat first, then choose a venue together.') + '</p>' +
          '<a class="btn fill" href="demo.html" style="margin-top:24px">Open test chat</a>' +
        '</div>' +
        (isSample
          ? '<div class="listing-notice">' +
              '<p class="cap" style="margin-bottom:12px">Demo only</p>' +
              '<p>There is no Opulé seller or transaction for this market sample. Do not send payment or arrange a meetup based on this test listing.</p>' +
            '</div>'
          : '<div class="listing-notice">' +
              '<p class="cap" style="margin-bottom:12px">Message the seller</p>' +
              '<p>Chat opens after you sign in with a verified mobile number. Payment stays in escrow — agree on the meetup in chat, not on the price.</p>' +
              '<button id="sign-in-chat" class="btn quiet" type="button" style="margin-top:16px">Sign in to chat</button>' +
            '</div>') +
      '</div>' +
    '</div>';

  var signInChat = document.getElementById('sign-in-chat');
  if (signInChat) signInChat.addEventListener('click', function () {
    alert('Sign-in and chat are not part of this mock yet.');
  });
})().catch(OPULE.db.report);
