(function () {
  'use strict';
  OPULE.renderInbox = function (root) {
    var user = OPULE.getUser();
    if (!user) {
      root.innerHTML = '<h2>Sign in to open your messages.</h2><a class="btn" href="auth.html">Your account</a>';
      return;
    }
    root.innerHTML = '<div class="inbox-toolbar"><h2>Correspondence</h2><button class="btn quiet" type="button" data-refresh>Refresh inbox</button></div>' +
      '<p class="form-note">Messages are saved on this server. Refresh for new replies. No payments, escrow, identity checks or item authentication are provided. ' +
      (user.demo ? 'This is a shared sample account; never enter personal information.' : 'Never send passwords, ID images or payment credentials in chat.') + '</p>' +
      '<div class="inbox-layout"><nav class="inbox-threads" aria-label="Your conversations"></nav><section class="inbox-conversation" aria-label="Selected conversation">' +
      '<h3 data-title>Select a conversation</h3><a data-listing hidden>View piece</a><div class="inbox-log" role="log" aria-label="Messages" aria-live="polite" tabindex="0"></div>' +
      '<form class="inbox-compose"><label class="field"><span>Your message</span><textarea rows="3" maxlength="2000" required disabled></textarea></label>' +
      '<button class="btn fill" type="submit" disabled>Send message</button></form></section></div><p data-status role="status" aria-live="polite"></p>';
    var find = function (selector) { return root.querySelector(selector); };
    var threads = [], selected = null, version = 0, sending = false, refreshing = false;
    var drafts = new Map();
    var input = find('textarea'), send = find('[type="submit"]'), log = find('.inbox-log'), status = find('[data-status]');
    var wanted = new URLSearchParams(location.search).get('conversation');
    function renderThreads() {
      var fragment = document.createDocumentFragment();
      threads.forEach(function (thread) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'inbox-thread';
        button.disabled = sending;
        button.setAttribute('aria-pressed', String(selected && thread.id === selected.id));
        var name = document.createElement('strong');
        name.textContent = thread.participantName;
        var piece = document.createElement('span');
        piece.textContent = thread.listingTitle + ' · ' + thread.listingStatus;
        var last = document.createElement('small');
        last.textContent = thread.lastMessage ? thread.lastMessage.text : 'No messages yet';
        button.append(name, piece, last);
        button.addEventListener('click', function () { select(thread).catch(fail); });
        fragment.appendChild(button);
      });
      find('.inbox-threads').replaceChildren(fragment);
    }
    function fail(error) {
      status.textContent = error.message + ' Your draft is kept. Use Refresh inbox to retry.';
      OPULE.db.report(error);
    }
    async function select(thread) {
      if (sending) return;
      selected = thread;
      var request = ++version;
      input.disabled = send.disabled = true;
      find('[data-title]').textContent = thread.participantName + ' / ' + thread.listingTitle;
      find('[data-listing]').href = 'listing.html?id=' + encodeURIComponent(thread.listingId);
      find('[data-listing]').hidden = thread.listingStatus === 'archived';
      input.value = drafts.get(thread.id) || '';
      log.replaceChildren();
      renderThreads();
      status.textContent = 'Loading conversation…';
      try {
        var messages = await OPULE.db.messagesFor(thread.id);
        if (request !== version) return;
        var fragment = document.createDocumentFragment();
        messages.forEach(function (message) {
          var bubble = document.createElement('p');
          bubble.className = 'inbox-message' + (message.senderId === user.id ? ' is-mine' : '');
          bubble.textContent = message.text;
          fragment.appendChild(bubble);
        });
        log.replaceChildren(fragment);
        log.scrollTop = log.scrollHeight;
        input.disabled = send.disabled = false;
        status.textContent = messages.length ? 'Conversation up to date. Showing up to 500 latest messages.' : 'No messages yet. Start the conversation.';
      } catch (error) {
        if (request === version) fail(error);
      }
    }
    async function refresh() {
      if (sending || refreshing) return;
      refreshing = true;
      find('[data-refresh]').disabled = true;
      status.textContent = 'Refreshing inbox…';
      try {
        threads = await OPULE.db.api('inbox');
        var thread = threads.find(function (item) { return item.id === (selected ? selected.id : wanted); }) || threads[0];
        if (thread) await select(thread);
        else {
          selected = null;
          renderThreads();
          status.textContent = 'No conversations yet. Buyers can open an enquiry from an available listing.';
        }
      } catch (error) { fail(error); }
      finally {
        refreshing = false;
        find('[data-refresh]').disabled = false;
      }
    }
    input.addEventListener('input', function () { if (selected) drafts.set(selected.id, input.value); });
    find('.inbox-compose').addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!selected || sending || send.disabled) return;
      var text = input.value.trim();
      if (!text) { status.textContent = 'Write a message before sending.'; input.focus(); return; }
      sending = true;
      input.disabled = send.disabled = true;
      find('[data-refresh]').disabled = true;
      renderThreads();
      status.textContent = 'Sending message…';
      try {
        var message = await OPULE.db.sendMessage(selected.id, user.id, text);
        selected.lastMessage = message;
        drafts.delete(selected.id);
        input.value = '';
        var bubble = document.createElement('p');
        bubble.className = 'inbox-message is-mine';
        bubble.textContent = message.text;
        log.appendChild(bubble);
        log.scrollTop = log.scrollHeight;
        status.textContent = 'Message sent.';
      } catch (error) { fail(error); }
      finally {
        sending = false;
        input.disabled = send.disabled = false;
        find('[data-refresh]').disabled = false;
        renderThreads();
      }
    });
    find('[data-refresh]').addEventListener('click', refresh);
    refresh();
  };
})();
