(function () {
  'use strict';
  var key = 'opule_theme';
  var system = matchMedia('(prefers-color-scheme: dark)');
  var preference = null;
  var storageError = '';
  var toggle;
  function apply() {
    var dark = preference ? preference === 'dark' : system.matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    if (toggle) toggle.setAttribute('aria-pressed', String(dark));
  }
  try {
    preference = localStorage.getItem(key);
    if (preference !== null && preference !== 'light' && preference !== 'dark') {
      throw new Error('Invalid theme preference');
    }
  } catch (error) {
    console.error('Unable to load theme preference:', error);
    preference = null;
    storageError = 'Your theme preference could not be read. Using your system theme.';
  }
  apply();
  system.addEventListener('change', function () { if (!preference) apply(); });
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    if (event.newValue !== null && event.newValue !== 'light' && event.newValue !== 'dark') {
      console.error('Invalid theme preference received from browser storage');
      return;
    }
    preference = event.newValue;
    apply();
  });
  document.addEventListener('DOMContentLoaded', function () {
    toggle = document.getElementById('theme-toggle');
    var status = document.getElementById('theme-status');
    toggle.hidden = false;
    apply();
    status.textContent = storageError;
    toggle.addEventListener('click', function () {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply();
      try {
        localStorage.setItem(key, preference);
        status.textContent = '';
      } catch (error) {
        console.error('Unable to save theme preference:', error);
        status.textContent = 'Theme changed for this page, but your browser could not save it for your next visit.';
      }
    });
  });
})();
