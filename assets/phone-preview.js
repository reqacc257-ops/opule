(function () {
  'use strict';
  var dialog;
  var frame;
  var trigger;

  function closePreview() {
    if (dialog && dialog.open) dialog.close();
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download')) return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== '/demo.html') return;
    event.preventDefault();
    if (dialog && dialog.open) return;
    trigger = link;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'phone-preview-modal';
      dialog.setAttribute('aria-labelledby', 'phone-preview-title');
      dialog.innerHTML = '<header class="phone-preview-toolbar"><h2 id="phone-preview-title">Mobile simulation</h2>' +
        '<button class="btn quiet" type="button" aria-label="Close mobile simulation">Close</button></header>' +
        '<p class="phone-preview-status" role="status">Loading the sample phone…</p>';
      dialog.querySelector('button').addEventListener('click', closePreview);
      dialog.addEventListener('click', function (click) {
        if (click.target !== dialog) return;
        var bounds = dialog.getBoundingClientRect();
        if (click.clientX < bounds.left || click.clientX > bounds.right ||
            click.clientY < bounds.top || click.clientY > bounds.bottom) closePreview();
      });
      dialog.addEventListener('close', function () {
        frame.remove();
        frame = null;
        if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
      });
      document.body.appendChild(dialog);
    }
    var status = dialog.querySelector('[role="status"]');
    status.hidden = false;
    status.textContent = 'Loading the sample phone…';
    frame = document.createElement('iframe');
    frame.title = 'Interactive Opulé sample phone';
    frame.allow = 'camera \'self\'';
    url.searchParams.set('embedded', '1');
    frame.src = url.href;
    var currentFrame = frame;
    frame.addEventListener('load', function () {
      if (frame !== currentFrame) return;
      var loaded = frame.contentDocument;
      var ready = loaded && loaded.body.classList.contains('handover-page');
      status.hidden = !!ready;
      if (!ready) status.textContent = 'The mobile simulation could not load. Close it and try again.';
    });
    dialog.appendChild(frame);
    dialog.showModal();
  });

  window.addEventListener('message', function (event) {
    if (frame && event.origin === location.origin && event.source === frame.contentWindow &&
        event.data === 'opule:close-phone-preview') closePreview();
  });
})();
