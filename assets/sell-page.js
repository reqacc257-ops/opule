(async function () {
  await OPULE.ready;
  var root = document.getElementById('sell-root');
  var seller = OPULE.getSeller();
  var user = OPULE.getUser();
  var verified = user && user.role === 'seller' && seller && seller.status === 'verified';
  document.querySelectorAll('.workspace-nav a[href^="#studio-"]').forEach(function (link) { link.hidden = !verified; });
  if (user && user.demo) document.querySelector('.workspace-nav a[href="register.html"]').hidden = true;

  async function renderStudio() {
    var mine = OPULE.getListings().filter(function (listing) { return listing.sellerId === user.id; });
    var records = await Promise.all([OPULE.db.all('conversations'), OPULE.db.all('handovers')]);
    var conversations = records[0].filter(function (row) { return row.sellerId === user.id; });
    var handovers = records[1].filter(function (row) { return row.sellerId === user.id && !row.completed; });
    if (user.demo === true) {
      return OPULE.renderSampleStudio(root, user, mine, conversations, records[1]);
    }
    root.innerHTML =
      '<section data-studio-view="overview"><div class="studio-heading"><div><p class="cap">Seller workspace' +
      '</p><h1 class="serif">Every piece has a next chapter.</h1><p>Welcome back, ' + OPULE.esc(user.name.split(' ')[0]) +
      '. Your collection, conversations, and next handovers, in one considered space.</p></div>' +
      '<a class="btn fill" href="#new-listing">List a piece</a>' +
      '</div>' +
      '<div class="studio-metrics">' +
      '<div class="studio-metric"><p class="cap">Listed pieces</p><strong>' + mine.length + '</strong><small>Your current collection</small></div>' +
      '<div class="studio-metric"><p class="cap">Conversations</p><strong>' + conversations.length + '</strong><small>Started with your buyers</small></div>' +
      '<div class="studio-metric"><p class="cap">Open handovers</p><strong>' + handovers.length + '</strong><small>Plans not yet completed</small></div>' +
      '</div></section>' +
      '<section data-studio-view="correspondence" hidden><section class="studio-section" id="studio-enquiries"><h2 class="serif">Conversations, not noise.</h2>' +
      '<div id="seller-inbox-root"></div></section></section>' +
      '<section data-studio-view="collection" hidden><section class="studio-section" id="studio-listings"><h2 class="serif">Your collection</h2><p>' +
      'Every piece currently listed under your account.' +
      '</p><div class="catalog-grid" id="seller-catalog"></div><p id="seller-empty" class="form-note" hidden>No pieces listed yet. Start your collection below.</p></section>' +
      '<section class="studio-form-section" id="new-listing"></section></section>';
    var collectionReady = false;
    var inboxReady = false;
    return function (view) {
      if (view === 'correspondence' && !inboxReady) {
        OPULE.renderInbox(document.getElementById('seller-inbox-root'));
        inboxReady = true;
      }
      if (view !== 'collection' || collectionReady) return;
      var catalog = document.getElementById('seller-catalog');
      OPULE.renderListingManagement(catalog, mine);
      document.getElementById('seller-empty').hidden = mine.length !== 0;
      renderForm(document.getElementById('new-listing'));
      collectionReady = true;
    };
  }

  /* ---------- no application yet ---------- */

  function renderIntro() {
    root.innerHTML =
      '<div class="two-col">' +
        '<div>' +
          '<p class="cap">Selling on Opulé</p>' +
          '<h1 class="display serif" style="font-size:56px;margin-top:16px">Apply to list your collection.</h1>' +
          '<p style="margin-top:28px;max-width:520px;font-size:19px">Seller applications are saved for review. Automated identity checks, video-call booking and a staff review dashboard are not available yet. Do not enter real ID details while testing.</p>' +
          '<a class="btn fill" href="register.html" style="margin-top:36px">Start the application</a>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="head"><span class="cap">Planned seller review · not operational</span></div>' +
          '<ul class="checklist">' +
            '<li><span class="mark serif">1</span><span>Government ID and a mobile number on your name</span><span class="state">Required</span></li>' +
            '<li><span class="mark serif">2</span><span>A short written application — what you sell and where your items come from</span><span class="state">Required</span></li>' +
            '<li><span class="mark serif">3</span><span>A video call with Opulé staff, ID in hand</span><span class="state">Scheduled</span></li>' +
            '<li><span class="mark serif">4</span><span>Review by a human, not a model</span><span class="state">Min. 2 days</span></li>' +
          '</ul>' +
          '<hr class="rule">' +
          '<p style="font-size:15px">Review takes a <strong style="color:var(--ivory)">minimum of two days</strong> after your video call. Most applications hear back within four. There is no way to pay to skip the line.</p>' +
        '</div>' +
      '</div>';
  }

  /* ---------- application pending ---------- */

  function renderPending() {
    var applied = new Date(seller.appliedAt);
    var earliest = new Date(seller.appliedAt);
    earliest.setDate(earliest.getDate() + 2);

    root.innerHTML =
      '<p class="cap">Seller application</p>' +
      '<h1 class="display serif" style="font-size:56px;margin-top:16px">Under review.</h1>' +
      '<p style="margin-top:24px;max-width:560px;font-size:19px">Thank you, ' + OPULE.esc(seller.name.split(' ')[0]) + '. Your application was saved. Staff review, video calls, email and SMS notifications are not operational in this prototype. Your selected call time is a preference, not a confirmed booking.</p>' +
      '<div class="two-col" style="margin-top:56px">' +
        '<div class="panel">' +
          '<div class="head"><span class="cap">Status</span><span class="cap" style="color:var(--ink)">Pending</span></div>' +
          '<ul class="checklist">' +
            '<li><span class="mark serif">✓</span><span>Application submitted</span><span class="state done">' + OPULE.fmtDate(applied) + '</span></li>' +
            '<li><span class="mark serif">✓</span><span>Application fields saved · not ID-checked</span><span class="state done">Saved</span></li>' +
            '<li><span class="mark serif">○</span><span>Preferred call time — ' + OPULE.esc(seller.callSlot) + '</span><span class="state">Not booked</span></li>' +
            '<li><span class="mark serif">○</span><span>Staff review</span><span class="state">Earliest ' + OPULE.fmtDate(earliest) + '</span></li>' +
          '</ul>' +
        '</div>' +
        '<div>' +
          '<div style="border:1px solid var(--line);padding:28px 32px">' +
            '<p class="cap" style="margin-bottom:16px">Your video call</p>' +
            '<p style="font-size:16px">Preferred time: ' + OPULE.esc(seller.callSlot) + '. This is not a confirmed appointment. No identity check is performed by this prototype.</p>' +
          '</div>' +
          '<div style="border:1px solid var(--line);padding:28px 32px;margin-top:24px">' +
            '<p class="cap" style="margin-bottom:16px">While you wait</p>' +
            '<p style="font-size:16px">You can browse and buy as usual. Selling unlocks the moment review clears.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      demoBox();
    wireDemo();
  }

  /* ---------- verified: the sell form ---------- */

  function renderForm(target) {
    target.innerHTML =
      '<p class="cap">Seller listing</p>' +
      '<h2 class="serif">List a piece.</h2>' +
      '<p class="form-note">Set a clear price and describe the piece accurately. Real escrow and payment are not available in this prototype.</p>' +
      '<div class="two-col" style="margin-top:56px">' +
        '<form id="sell-form" novalidate>' +
          '<label class="field"><span>Item title</span><input type="text" id="f-title" maxlength="200" placeholder="e.g. Vintage gold wristwatch" required></label>' +
          '<label class="field"><span>Category</span><select id="f-category">' +
            '<option>Watches</option><option>Bags</option><option>Jewelry</option><option>Sneakers</option><option>Accessories</option><option>Other</option>' +
          '</select></label>' +
          '<label class="field"><span>Listed price (PHP)</span><input type="number" id="f-price" min="1000" max="100000000" step="1" placeholder="185000" required></label>' +
          '<label class="field"><span>Details</span><input type="text" id="f-meta" maxlength="2000" placeholder="Year, papers, box, receipts…"></label>' +
          '<label class="field"><span>Condition</span><select id="f-condition">' +
            '<option>New</option><option>Excellent</option><option>Very good</option><option>Good</option><option>Fair</option>' +
          '</select></label>' +
          '<label class="field"><span>Your general area</span><select id="f-area">' + OPULE.areaOptions(seller.area) + '</select></label>' +
          '<p class="form-note">Buyers only ever see the general area. Meetups are suggested roughly halfway between you and them.</p>' +
          '<p class="error-note" id="f-error" role="alert"></p>' +
          '<button class="btn fill" id="publish-listing" type="submit" style="margin-top:28px">List at this price</button>' +
        '</form>' +
        '<div>' +
          '<div class="panel">' +
            '<div class="head"><span class="cap">Before you list</span></div>' +
            '<dl class="facts">' +
              '<dt>Photos</dt><dd>After creating a piece, open Manage piece to upload a JPEG, PNG or WebP photo. Up to 5 MB and 20 megapixels; metadata is removed.</dd>' +
              '<dt>Payments</dt><dd>No payments are processed or fees charged by this prototype.</dd>' +
              '<dt>Handovers</dt><dd>The sample accounts demonstrate a simulated exchange, not real escrow.</dd>' +
            '</dl>' +
          '</div>' +
          '<div id="listed-note"></div>' +
        '</div>' +
      '</div>' +
      demoBox();
    wireDemo();

    document.getElementById('sell-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var button = document.getElementById('publish-listing');
      if (button.disabled) return;
      var title = document.getElementById('f-title').value.trim();
      var price = Number(document.getElementById('f-price').value);
      var err = document.getElementById('f-error');
      if (!title || !Number.isInteger(price) || price < 1000 || price > 100000000) {
        err.textContent = 'Enter a title and a whole-peso price between PHP 1,000 and PHP 100,000,000.';
        err.style.display = 'block';
        return;
      }
      err.style.display = 'none';
      button.disabled = true;
      button.textContent = 'Listing your piece...';
      try {
      var listing = await OPULE.addListing({
        title: title,
        category: document.getElementById('f-category').value,
        price: price,
        meta: document.getElementById('f-meta').value.trim(),
        condition: document.getElementById('f-condition').value,
        area: document.getElementById('f-area').value
      });
      var mine = OPULE.getListings().filter(function (row) { return row.sellerId === user.id; });
      if (!mine.some(function (row) { return row.id === listing.id; })) mine.push(listing);
      OPULE.renderListingManagement(document.getElementById('seller-catalog'), mine);
      document.getElementById('seller-empty').hidden = true;
      document.querySelector('.studio-metric strong').textContent = document.getElementById('seller-catalog').children.length;
      document.getElementById('listed-note').innerHTML =
        '<div style="border:1px solid var(--gold);padding:24px 28px;margin-top:24px">' +
          '<p class="cap" style="margin-bottom:8px">Listed</p>' +
          '<p style="font-size:16px"><strong style="color:var(--ivory)">' + OPULE.esc(listing.title) + '</strong> is on the ledger at ' + OPULE.peso(listing.price) + '. ' +
          '<a href="listing.html?id=' + encodeURIComponent(listing.id) + '">View the listing</a> or <a href="index.html#browse">see it among recent items</a>.</p>' +
        '</div>';
      e.target.reset();
      } catch (error) {
        err.textContent = error.message;
        err.style.display = 'block';
        OPULE.db.report(error);
      } finally {
        button.disabled = false;
        button.textContent = 'List at this price';
      }
    });
  }

  /* ---------- demo controls (mock only) ---------- */

  function demoBox() {
    if (!user || user.demo || !OPULE.localDemoEnabled) return '';
    var btn = seller && seller.status === 'pending'
      ? '<button type="button" id="demo-approve">Simulate reviewer approval</button>'
      : '';
    return '<div class="demo-box"><strong>Mock controls</strong> — these stand in for the staff back office. ' +
           btn + '<button type="button" id="demo-reset">Reset my application</button></div>';
  }

  function wireDemo() {
    var a = document.getElementById('demo-approve');
    if (a) a.addEventListener('click', async function () {
      try {
      seller.status = 'verified';
      await OPULE.setSeller(seller);
      location.reload();
      } catch (error) { OPULE.db.report(error); }
    });
    var r = document.getElementById('demo-reset');
    if (r) r.addEventListener('click', async function () {
      try {
      await OPULE.clearSeller();
      location.reload();
      } catch (error) { OPULE.db.report(error); }
    });
  }

  var renderView;
  if (!user) {
    root.innerHTML = '<p class="cap">Your account</p><h1 class="display serif">Sign in to sell.</h1><a class="btn fill" href="auth.html">Sign in or create an account</a>';
  } else if (user.role !== 'seller') {
    root.innerHTML = '<p class="cap">Seller studio</p><h1 class="serif">A space for your collection.</h1><p class="form-note">You are signed in as a buyer. Create or choose a seller account to open the studio.</p><a class="btn fill" href="auth.html">Choose a seller account</a>';
  } else if (!seller) renderIntro();
  else if (seller.status === 'pending') renderPending();
  else renderView = await renderStudio();
  OPULE.initStudioNavigation(renderView);
})().catch(function (error) {
  document.getElementById('sell-root').textContent = 'Your studio could not be loaded. Please refresh to try again.';
  OPULE.db.report(error);
});
