(function () {
  'use strict';
  var esc = OPULE.esc;
  function handoverStatus(plan) {
    if (!plan) return 'Conversation open';
    if (plan.completed) return 'Handover complete';
    if (!plan.buyerAgreement || !plan.sellerAgreement) return 'Awaiting agreement';
    if (!plan.proposedVenue) return 'Choose a venue';
    return plan.venueAccepted ? 'Meeting agreed' : 'Venue proposed';
  }
  function handoverLink(buyerId) {
    return 'demo.html?account=alex&live=1&buyer=' + encodeURIComponent(buyerId);
  }
  OPULE.studioHandoverStatus = handoverStatus;
  OPULE.initStudioNavigation = function (renderView) {
    var root = document.getElementById('sell-root');
    OPULE.initPageNavigation({
      root: root, nav: document.querySelector('.studio-sidebar .workspace-nav'),
      attribute: 'data-studio-view', renderView: renderView, defaultHash: '#sell-root',
      routes: { '#sell-root': 'overview', '#studio-listings': 'collection', '#new-listing': 'collection',
        '#studio-enquiries': 'correspondence', '#studio-handovers': 'correspondence' }
    });
  };
  OPULE.renderSampleStudio = async function (root, user, listings, conversations, handovers) {
    var buyers = await OPULE.db.all('users');
    var histories = await Promise.all(conversations.map(function (row) { return OPULE.db.messagesFor(row.id); }));
    var threads = conversations.map(function (row, index) {
      return {
        conversation: row,
        buyer: buyers.find(function (buyer) { return buyer.id === row.buyerId; }),
        listing: listings.find(function (listing) { return listing.id === row.listingId; }),
        messages: histories[index].slice().sort(function (a, b) { return a.createdAt.localeCompare(b.createdAt); }),
        plan: handovers.filter(function (plan) { return plan.conversationId === row.id; })
          .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); })[0]
      };
    });
    var selected = threads[0];
    var sending = false;
    var loading = false;
    var selectionVersion = 0;
    var drafts = new Map();
    function buyerName(thread) { return thread.buyer ? thread.buyer.name : 'Buyer profile unavailable'; }
    function needsReply(thread) {
      var last = thread.messages[thread.messages.length - 1];
      return last && last.senderId !== user.id;
    }
    var replyCount = threads.filter(needsReply).length;
    var openPlans = threads.filter(function (thread) { return thread.plan && !thread.plan.completed; });
    root.classList.add('sample-studio');
    document.body.classList.add('sample-studio-page');
    root.innerHTML =
      '<header class="atelier-heading"><div><p class="cap">Seller services</p><h1 class="serif">Your studio, ' +
      esc(user.name.split(' ')[0]) + '.</h1><p>A clear view of your pieces and the people interested in them.</p></div>' +
      '<a class="atelier-profile" href="auth.html"><span class="atelier-monogram" aria-hidden="true">AS</span><span>' + esc(user.name) +
      '<small>Shared sample account</small></span><span aria-hidden="true">↗</span></a></header>' +
      '<div class="atelier-notice"><span class="atelier-dot" aria-hidden="true"></span><p>You’re in the sample studio. Explore freely; messages are shared with other testers. No real sales or payments.</p></div>' +
      '<section data-studio-view="overview"><nav class="atelier-stats" aria-label="Studio overview">' +
      '<a href="#studio-listings"><span class="cap">In your collection</span><strong>' + listings.length + '<small>pieces</small></strong><span>Review your inventory <span aria-hidden="true">↗</span></span></a>' +
      '<a href="#studio-enquiries"><span class="cap">Buyer conversations</span><strong>' + threads.length + '<small>enquiries</small></strong><span id="studio-reply-count">' + replyCount + ' awaiting your reply</span></a>' +
      '<a href="#studio-handovers"><span class="cap">Open handovers</span><strong>' + openPlans.length + '<small>sample plans</small></strong><span>Agreements &amp; meeting details <span aria-hidden="true">↗</span></span></a></nav>' +
      '<div class="atelier-overview-note"><p class="cap">Your private workspace</p><h2 class="serif">A place for every next step.</h2><p>Open Collection to review your pieces, or Correspondence to reply to buyers and arrange a handover.</p></div></section>' +
      '<div data-studio-view="collection" hidden></div><div data-studio-view="correspondence" hidden></div>' +
      '<footer class="atelier-footer"><span class="brand">OPULÉ</span><p>A quieter way to manage exceptional pieces.</p><a href="auth.html">Create your own seller account ↗</a></footer>';
    var correspondenceMarkup =
      '<div class="atelier-workbench"><section id="studio-enquiries" class="atelier-panel"><div class="atelier-section-head"><div><p class="cap">Correspondence</p><h2 class="serif">Buyer enquiries</h2></div><span class="atelier-count">' +
      threads.length + '</span></div><div class="atelier-inbox"><div class="atelier-threads"><label class="atelier-search"><span class="sr-only">Find a buyer</span><input id="studio-buyer-search" type="search" placeholder="Find a buyer…" autocomplete="off"></label>' +
      '<div id="studio-threads" aria-label="Buyer conversations"></div><p id="studio-thread-empty" class="atelier-empty" hidden>No matching buyers.</p></div>' +
      '<section class="atelier-conversation" aria-label="Selected conversation"><div id="studio-chat-heading" class="atelier-chat-heading"></div>' +
      '<div id="studio-chat" class="atelier-messages" role="log" aria-label="Sample messages" aria-live="polite" tabindex="0"></div>' +
      '<form id="studio-compose" class="atelier-compose"><label for="studio-message">Reply as Alex · shared sample chat</label><textarea id="studio-message" rows="2" maxlength="2000" placeholder="Write a considered reply. No personal information." required></textarea>' +
      '<div><button id="studio-refresh" class="atelier-text-button" type="button">Refresh conversation</button><button id="studio-send" class="btn fill" type="submit">Send reply <span aria-hidden="true">↗</span></button></div>' +
      '<p id="studio-message-status" role="status" aria-live="polite"></p></form></section></div></section>' +
      '<aside id="studio-handovers" class="atelier-panel atelier-handovers"><div class="atelier-section-head"><div><p class="cap">Appointments</p><h2 class="serif">Handovers</h2></div></div><div id="studio-plans"></div>' +
      '<div class="atelier-tip"><p class="cap">A thoughtful exchange</p><ol><li>Agree on the piece &amp; price.</li><li>Choose a public venue together.</li><li>Inspect before accepting.</li></ol><p>All steps here are simulated. Location and sample ID details do not verify anyone’s identity.</p></div></aside></div>';
    var collectionMarkup =
      '<section id="studio-listings" class="atelier-panel atelier-inventory"><div class="atelier-section-head"><div><p class="cap">Inventory</p><h2 class="serif">The collection</h2></div><span class="atelier-tag">Reference pieces</span></div>' +
      '<div class="atelier-inventory-tools"><label class="atelier-search"><span class="sr-only">Search your collection</span><input id="studio-listing-search" type="search" placeholder="Find a piece or designer…" autocomplete="off"></label>' +
      '<label class="atelier-category"><span class="sr-only">Inventory category</span><select id="studio-category"><option value="">All categories</option></select></label><p id="studio-inventory-count" role="status"></p></div>' +
      '<div class="atelier-inventory-labels" aria-hidden="true"><span>Piece / collection</span><span>Reference price</span><span>Enquiries</span><span>Details</span></div><div id="seller-catalog"></div>' +
      '<p id="seller-empty" class="atelier-empty" hidden>No pieces match. Try another name or category.</p>' +
      '<p class="atelier-footnote">Illustrative stock photos, not the exact pieces. External reference prices; these are not offers for sale. Shared samples cannot publish or edit listings.</p></section>';
    var el = function (id) { return document.getElementById(id); };
    var composer;
    function renderThreads() {
      var query = el('studio-buyer-search').value.trim().toLocaleLowerCase();
      var visible = threads.filter(function (thread) { return buyerName(thread).toLocaleLowerCase().includes(query); });
      el('studio-threads').innerHTML = visible.map(function (thread) {
        var buyer = thread.buyer;
        var last = thread.messages[thread.messages.length - 1];
        return '<button class="atelier-thread" type="button" data-thread="' + esc(thread.conversation.id) + '" aria-pressed="' + (selected === thread) + '"' +
          (sending ? ' disabled' : '') + '><span class="atelier-avatar" aria-hidden="true">' + esc(buyer ? buyer.initials : '?') +
          '</span><span class="atelier-thread-copy"><strong>' + esc(buyerName(thread)) + '</strong><span>' +
          esc(last ? (last.senderId === user.id ? 'You: ' : '') + last.text : 'No messages yet. Start the conversation.') + '</span><small>' +
          esc(thread.listing ? thread.listing.title : 'Listing unavailable') + '</small></span>' +
          (needsReply(thread) ? '<span class="atelier-reply-dot" aria-label="Awaiting your reply"></span>' : '') + '</button>';
      }).join('');
      el('studio-thread-empty').hidden = visible.length !== 0;
      el('studio-reply-count').textContent = threads.filter(needsReply).length + ' awaiting your reply';
    }
    function renderConversation() {
      composer.disabled = !selected || loading;
      el('studio-send').disabled = !selected || loading;
      el('studio-refresh').disabled = !selected || loading;
      if (!selected) {
        el('studio-chat-heading').textContent = 'Your inbox is clear.';
        el('studio-chat').textContent = 'Buyer conversations will appear here.';
        return;
      }
      var buyer = selected.buyer;
      el('studio-chat-heading').innerHTML = '<div><strong>' + esc(buyerName(selected)) + '</strong><p>' +
        (buyer ? esc(buyer.area) + ' · ' + buyer.transactions + ' sample exchanges' : 'Buyer profile could not be found.') +
        '</p></div><a class="atelier-text-link" href="' + esc(handoverLink(selected.conversation.buyerId)) + '">Open handover ↗</a>';
      var fragment = document.createDocumentFragment();
      selected.messages.forEach(function (message) {
        var bubble = document.createElement('p');
        bubble.className = 'atelier-message' + (message.senderId === user.id ? ' is-mine' : '');
        bubble.textContent = message.text;
        fragment.appendChild(bubble);
      });
      el('studio-chat').replaceChildren(fragment);
      if (!selected.messages.length) el('studio-chat').textContent = 'No messages yet. Introduce yourself to start the conversation.';
      el('studio-chat').scrollTop = el('studio-chat').scrollHeight;
      composer.value = drafts.get(selected.conversation.id) || '';
    }
    function renderPlans() {
      var plans = threads.filter(function (thread) { return thread.plan; });
      el('studio-plans').innerHTML = plans.length ? plans.map(function (thread) {
        var venue = thread.plan.proposedVenue;
        return '<a class="atelier-plan" href="' + esc(handoverLink(thread.conversation.buyerId)) + '"><span class="atelier-tag">' +
          handoverStatus(thread.plan) + '</span><h3>' + esc(buyerName(thread)) + '</h3><p>' +
          esc(venue ? venue.name : 'Venue not selected') + '</p>' +
          (venue && venue.time ? '<p>' + esc(venue.time.replace('T', ' ')) + ' · PH time</p>' : '') +
          '<span class="atelier-text-link">Review plan ↗</span></a>';
      }).join('') : '<div class="atelier-no-plans"><span class="atelier-plan-symbol" aria-hidden="true">◇</span><h3 class="serif">The next chapter starts with a conversation.</h3><p>No saved handover plans yet. Open an enquiry, agree on the piece, then choose a meeting place.</p><a class="atelier-text-link" href="#studio-enquiries">Start with your inbox ↗</a></div>';
    }
    function renderInventory() {
      var query = el('studio-listing-search').value.trim().toLocaleLowerCase();
      var category = el('studio-category').value;
      var matches = listings.filter(function (listing) {
        return (!query || listing.title.toLocaleLowerCase().includes(query)) && (!category || listing.category === category);
      });
      el('seller-catalog').innerHTML = matches.map(function (listing) {
        var enquiries = threads.filter(function (thread) { return thread.conversation.listingId === listing.id; }).length;
        return '<a class="atelier-inventory-row" href="listing.html?id=' + encodeURIComponent(listing.id) + '"><span class="atelier-piece">' +
          (listing.image ? '<img src="' + esc(listing.image) + '" alt="Illustrative stock photo, not the exact piece" width="64" height="72" loading="lazy">' : '<span class="atelier-thumb-placeholder" aria-hidden="true">O</span>') +
          '<span><strong>' + esc(listing.title) + '</strong><small>' + esc(listing.category) + ' / ' + esc(listing.id) + ' · Stock sample</small></span></span>' +
          '<span class="atelier-price"><span class="sr-only">Reference price: </span>' + OPULE.peso(listing.price) + '</span>' +
          '<span class="atelier-enquiry-count">' + enquiries + '<span class="sr-only"> enquiries</span></span><span class="atelier-row-action">View piece ↗</span></a>';
      }).join('');
      el('seller-empty').hidden = matches.length !== 0;
      el('studio-inventory-count').textContent = matches.length + ' of ' + listings.length + ' pieces';
    }
    async function refreshConversation() {
      if (!selected || sending) return;
      var thread = selected;
      var version = ++selectionVersion;
      loading = true;
      renderConversation();
      el('studio-message-status').textContent = 'Refreshing conversation…';
      try {
        var messages = await OPULE.db.messagesFor(thread.conversation.id);
        thread.messages = messages;
        if (version !== selectionVersion) return;
        loading = false;
        renderThreads();
        renderConversation();
        el('studio-message-status').textContent = 'Conversation up to date.';
      } catch (error) {
        if (version !== selectionVersion) return;
        loading = false;
        renderConversation();
        el('studio-message-status').textContent = 'Could not refresh: ' + error.message + ' Use Refresh conversation to retry.';
        OPULE.db.report(error);
      }
    }
    function initCorrespondence() {
      composer = el('studio-message');
      el('studio-threads').addEventListener('click', function (event) {
        var button = event.target.closest('button[data-thread]');
        if (!button || sending) return;
        selected = threads.find(function (thread) { return thread.conversation.id === button.dataset.thread; });
        renderThreads();
        return refreshConversation();
      });
      composer.addEventListener('input', function () { if (selected) drafts.set(selected.conversation.id, composer.value); });
      el('studio-compose').addEventListener('submit', async function (event) {
        event.preventDefault();
        var text = composer.value.trim();
        if (!selected || sending || loading) return;
        if (!text) {
          el('studio-message-status').textContent = 'Write a message before sending.';
          composer.focus();
          return;
        }
        sending = true;
        el('studio-send').disabled = true;
        el('studio-refresh').disabled = true;
        composer.disabled = true;
        renderThreads();
        el('studio-message-status').textContent = 'Sending reply…';
        try {
          var message = await OPULE.db.sendMessage(selected.conversation.id, user.id, text);
          selected.messages.push(message);
          drafts.delete(selected.conversation.id);
          el('studio-message-status').textContent = 'Reply sent. Visible to other sample-account users.';
        } catch (error) {
          el('studio-message-status').textContent = 'Reply not sent: ' + error.message + ' Your draft is kept; try again.';
          OPULE.db.report(error);
        } finally {
          sending = false;
          renderThreads();
          renderConversation();
        }
      });
      el('studio-refresh').addEventListener('click', refreshConversation);
      el('studio-buyer-search').addEventListener('input', renderThreads);
      renderThreads();
      renderConversation();
      renderPlans();
    }
    var initialized = new Set();
    return function (view) {
      if (view === 'overview' || initialized.has(view)) return;
      var panel = root.querySelector('[data-studio-view="' + view + '"]');
      panel.innerHTML = view === 'collection' ? collectionMarkup : correspondenceMarkup;
      if (view === 'collection') {
        Array.from(new Set(listings.map(function (listing) { return listing.category; }))).sort().forEach(function (category) {
          var option = document.createElement('option');
          option.value = category;
          option.textContent = category;
          el('studio-category').appendChild(option);
        });
        el('studio-listing-search').addEventListener('input', renderInventory);
        el('studio-category').addEventListener('change', renderInventory);
        renderInventory();
      } else initCorrespondence();
      initialized.add(view);
    };
  };
})();
