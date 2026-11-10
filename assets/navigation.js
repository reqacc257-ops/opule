(function () {
  'use strict';
  OPULE.initNavigationIndicator = function (nav) {
    function update() {
      var active = nav.querySelector('[aria-current]');
      if (!active || active.hidden) return;
      nav.classList.add('smooth-nav');
      nav.style.setProperty('--nav-x', active.offsetLeft + 'px');
      nav.style.setProperty('--nav-y', active.offsetTop + 'px');
      nav.style.setProperty('--nav-width', active.offsetWidth + 'px');
      nav.style.setProperty('--nav-height', active.offsetHeight + 'px');
    }
    new MutationObserver(update).observe(nav, { subtree: true, attributes: true, attributeFilter: ['aria-current', 'hidden'] });
    if (window.ResizeObserver) {
      var observer = new window.ResizeObserver(update);
      observer.observe(nav);
      Array.from(nav.children).forEach(function (child) { observer.observe(child); });
    }
    window.addEventListener('resize', update);
    update();
    return update;
  };

  OPULE.initPageNavigation = function (options) {
    var root = options.root;
    var nav = options.nav;
    var attribute = options.attribute || 'data-page-view';
    var panels = Array.from(root.querySelectorAll('[' + attribute + ']'));
    var links = Array.from(nav.querySelectorAll('a[href^="#"]')).filter(function (link) { return !link.hidden; });
    var currentView;
    var indicator = OPULE.initNavigationIndicator(nav);
    function update() {
      var hash = Object.hasOwn(options.routes, location.hash) ? location.hash : options.defaultHash;
      var view = options.routes[hash];
      var active = links.find(function (link) { return options.routes[link.getAttribute('href')] === view; });
      links.forEach(function (link) {
        if (link === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      indicator();
      if (panels.length && view !== currentView) {
        panels.forEach(function (panel) { panel.hidden = panel.getAttribute(attribute) !== view; });
        if (options.renderView) options.renderView(view);
        if (options.onChange) options.onChange(view);
        if (currentView) {
          root.tabIndex = -1;
          root.focus({ preventScroll: true });
          if (options.scrollTarget) options.scrollTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
          else window.scrollTo({ top: 0, behavior: 'instant' });
        }
        currentView = view;
      }
    }
    function navigate(event) {
      var link = event.target.closest('a[href^="#"]');
      if (!panels.length || !link || event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
      var hash = link.getAttribute('href');
      if (!Object.hasOwn(options.routes, hash)) return;
      event.preventDefault();
      if (location.hash !== hash) window.history.pushState(null, '', hash);
      update();
    }
    nav.addEventListener('click', navigate);
    root.addEventListener('click', navigate);
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    update();
  };

  OPULE.initFormSteps = function (form) {
    var steps = Array.from(form.querySelectorAll('[data-form-step]'));
    var progress = form.querySelector('.form-progress');
    var items = Array.from(progress.children);
    var current = 0;
    function show(index) {
      current = index;
      steps.forEach(function (step, position) { step.hidden = position !== current; });
      items.forEach(function (item, position) {
        if (position === current) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      form.querySelector('[data-step-back]').hidden = current === 0;
      form.querySelector('[data-step-next]').hidden = current === steps.length - 1;
      form.querySelector('[type="submit"]').hidden = current !== steps.length - 1;
      indicator();
    }
    function invalid(step) {
      return Array.from(step.querySelectorAll('input, select, textarea')).find(function (field) { return !field.checkValidity(); });
    }
    function focusStep() {
      var heading = steps[current].querySelector('legend');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      progress.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    var indicator = OPULE.initNavigationIndicator(progress);
    form.querySelector('[data-step-next]').addEventListener('click', function () {
      var field = invalid(steps[current]);
      if (field) { field.reportValidity(); return; }
      show(Math.min(current + 1, steps.length - 1));
      focusStep();
    });
    form.querySelector('[data-step-back]').addEventListener('click', function () {
      show(Math.max(0, current - 1));
      focusStep();
    });
    form.addEventListener('submit', function (event) {
      var index = steps.findIndex(function (step) { return invalid(step); });
      if (index === -1 && current === steps.length - 1) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (index !== -1) {
        show(index);
        invalid(steps[index]).reportValidity();
      } else {
        show(current + 1);
        focusStep();
      }
    }, true);
    show(0);
  };

  document.querySelectorAll('header nav').forEach(OPULE.initNavigationIndicator);
})();
