import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../assets/theme.js', import.meta.url), 'utf8');

test('theme control has an accessible label and decorative sun and moon switch', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="theme-toggle"[^>]*type="button"[^>]*aria-pressed="false"/);
  assert.match(html, /aria-label="Dark mode"/);
  assert.match(html, /<span class="theme-switch" aria-hidden="true"><span class="theme-switch-thumb"><\/span>/);
  assert.match(html, /class="theme-icon theme-sun"/);
  assert.match(html, /class="theme-icon theme-moon"/);
  const css = readFileSync(new URL('../../assets/discovery.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /\.theme-toggle\[aria-pressed="true"\] \.theme-switch-thumb/);
});

test('dark palette uses readable gold text and subdued whites without recoloring photos', () => {
  const css = readFileSync(new URL('../../assets/discovery.css', import.meta.url), 'utf8');
  const dark = css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)[1];
  assert.match(dark, /--text: #dcc38f/);
  assert.match(dark, /--text-secondary: #bca983/);
  assert.match(dark, /--photo-mat: #37352e/);
  assert.match(dark, /--switch-thumb: #d8d0bd/);
  assert.match(css, /background: var\(--photo-mat\)/);
  assert.doesNotMatch(css, /filter:\s*(?:brightness|sepia|invert)/);
});

function theme({ stored = null, dark = false, failRead = false, failWrite = false } = {}) {
  const events = {}, systemEvents = {}, windowEvents = {}, errors = [], writes = [];
  const toggle = { hidden: true, setAttribute(name, value) { this[name] = value; }, addEventListener(name, callback) { this[name] = callback; } };
  const status = { textContent: '' };
  const document = {
    documentElement: { dataset: {} },
    getElementById(id) { return id === 'theme-toggle' ? toggle : status; },
    addEventListener(name, callback) { events[name] = callback; }
  };
  const system = { matches: dark, addEventListener(name, callback) { systemEvents[name] = callback; } };
  runInNewContext(source, {
    document, matchMedia: () => system,
    window: { addEventListener(name, callback) { windowEvents[name] = callback; } },
    console: { error(...args) { errors.push(args); } },
    localStorage: {
      getItem() { if (failRead) throw new Error('Storage blocked'); return stored; },
      setItem(key, value) { if (failWrite) throw new Error('Storage blocked'); writes.push([key, value]); }
    }
  });
  return { document, system, events, systemEvents, windowEvents, toggle, status, errors, writes };
}

test('theme initializes before DOM readiness and follows system until explicitly toggled', () => {
  const state = theme({ dark: true });
  assert.equal(state.document.documentElement.dataset.theme, 'dark');
  state.events.DOMContentLoaded();
  assert.equal(state.toggle.hidden, false);
  assert.equal(state.toggle['aria-pressed'], 'true');
  state.system.matches = false;
  state.systemEvents.change();
  assert.equal(state.document.documentElement.dataset.theme, 'light');
  state.toggle.click();
  assert.equal(state.document.documentElement.dataset.theme, 'dark');
  assert.equal(state.toggle['aria-pressed'], 'true');
  assert.deepEqual(state.writes, [['opule_theme', 'dark']]);
  state.systemEvents.change();
  assert.equal(state.document.documentElement.dataset.theme, 'dark');
});

test('stored choice overrides system and responds to cross-tab preference changes', () => {
  const state = theme({ stored: 'light', dark: true });
  assert.equal(state.document.documentElement.dataset.theme, 'light');
  state.events.DOMContentLoaded();
  state.windowEvents.storage({ key: 'opule_theme', newValue: 'dark' });
  assert.equal(state.toggle['aria-pressed'], 'true');
  state.windowEvents.storage({ key: 'opule_discovery_saved', newValue: '[]' });
  assert.equal(state.document.documentElement.dataset.theme, 'dark');
  state.windowEvents.storage({ key: 'opule_theme', newValue: null });
  state.system.matches = false;
  state.systemEvents.change();
  assert.equal(state.document.documentElement.dataset.theme, 'light');
});

test('storage failures and invalid stored preferences are explicit and do not break toggling', () => {
  for (const options of [{ failRead: true, failWrite: true }, { stored: 'invalid', failWrite: true }]) {
    const state = theme(options);
    state.events.DOMContentLoaded();
    assert.match(state.status.textContent, /could not be read/);
    state.toggle.click();
    assert.equal(state.document.documentElement.dataset.theme, 'dark');
    assert.match(state.status.textContent, /could not save/);
    assert.equal(state.errors.length, 2);
    assert.equal(state.writes.length, 0);
  }
});
