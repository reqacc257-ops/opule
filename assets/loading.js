(function () {
  'use strict';

  function settleImage(image) {
    image.classList.remove('image-loading');
    if (!image.naturalWidth) {
      image.classList.add('image-unavailable');
      if (!image.dataset.loadingAlt) image.dataset.loadingAlt = image.alt;
      image.alt = 'Image unavailable: ' + image.dataset.loadingAlt;
      console.error('Opule image could not be loaded:', image.getAttribute('src'));
    }
  }

  function trackImage(image) {
    if (!image.getAttribute('src') || image.id === 'photo-preview') return;
    if (image.dataset.loadingAlt) image.alt = image.dataset.loadingAlt;
    image.classList.remove('image-unavailable');
    image.classList.add('image-loading');
    if (image.complete) settleImage(image);
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.tagName === 'IMG') trackImage(node);
    node.querySelectorAll('img').forEach(trackImage);
  }

  document.addEventListener('load', function (event) {
    if (event.target.tagName === 'IMG') event.target.classList.remove('image-loading');
  }, true);
  document.addEventListener('error', function (event) {
    if (event.target.tagName === 'IMG') settleImage(event.target);
  }, true);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === 'attributes') trackImage(record.target);
      else record.addedNodes.forEach(scan);
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  scan(document.body);

  function checkRegions() {
  document.querySelectorAll('[aria-busy="true"]').forEach(function (region) {
    region.setAttribute('aria-busy', 'false');
    var notice = document.createElement('p');
    notice.className = 'loading-error';
    notice.setAttribute('role', 'alert');
    notice.textContent = 'This content could not be loaded. Please refresh the page to try again.';
    region.replaceChildren(notice);
    console.error('Opule content did not finish rendering:', region.id);
  });
  }
  if (window.OPULE && OPULE.ready) OPULE.ready.then(function () { requestAnimationFrame(checkRegions); }, checkRegions);
  else checkRegions();
})();
