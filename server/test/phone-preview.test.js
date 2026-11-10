import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function harness() {
  const listeners = {};
  const messages = {};
  const status = {};
  const close = { addEventListener() {} };
  const frames = [];
  let modal;
  const document = {
    body: { appendChild(element) { modal = element; } },
    addEventListener(name, callback) { listeners[name] = callback; },
    createElement(tag) {
      const element = {
        listeners: {}, setAttribute() {},
        addEventListener(name, callback) { this.listeners[name] = callback; },
        appendChild(child) { frames.push(child); },
        querySelector(selector) { return selector === 'button' ? close : status; },
        showModal() { this.open = true; },
        close() { this.open = false; this.listeners.close(); },
        remove() { this.removed = true; },
        contentWindow: {},
        contentDocument: { body: { classList: { contains: value => value === 'handover-page' } } }
      };
      return element;
    }
  };
  const location = { href: 'https://opule.test/sell.html#studio-enquiries', origin: 'https://opule.test' };
  runInNewContext(readFileSync(new URL('../../assets/phone-preview.js', import.meta.url), 'utf8'), {
    document, location, URL,
    window: { addEventListener(name, callback) { messages[name] = callback; } }
  });
  function click(href, options = {}) {
    const link = { href, isConnected: true, hasAttribute: () => false, focus() { this.focused = true; } };
    const event = {
      button: 0, target: { closest: () => link },
      preventDefault() { this.defaultPrevented = true; }, ...options
    };
    listeners.click(event);
    return { event, link };
  }
  return { click, frames, status, messages, get modal() { return modal; } };
}

test('sample phone links open in place, keep query context, and close back to their trigger', () => {
  const h = harness();
  const { event, link } = h.click('https://opule.test/demo.html?account=alex&live=1&buyer=jamie');
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.modal.open, true);
  const frame = h.frames[0];
  const url = new URL(frame.src);
  assert.equal(url.searchParams.get('embedded'), '1');
  assert.equal(url.searchParams.get('buyer'), 'jamie');
  assert.equal(url.searchParams.get('account'), 'alex');
  assert.equal(url.searchParams.get('live'), '1');
  assert.ok(frame.title);
  frame.listeners.load();
  assert.equal(h.status.hidden, true);
  h.messages.message({ origin: 'https://other.test', source: frame.contentWindow, data: 'opule:close-phone-preview' });
  assert.equal(h.modal.open, true);
  h.messages.message({ origin: 'https://opule.test', source: {}, data: 'opule:close-phone-preview' });
  assert.equal(h.modal.open, true);
  h.messages.message({ origin: 'https://opule.test', source: frame.contentWindow, data: 'opule:close-phone-preview' });
  assert.equal(h.modal.open, false);
  assert.equal(frame.removed, true);
  assert.equal(link.focused, true);
  assert.doesNotThrow(() => frame.listeners.load(), 'A late iframe load after closing is ignored');
  h.click('https://opule.test/demo.html');
  assert.equal(h.modal.open, true);
  assert.equal(h.frames.length, 2);
});

test('unrelated, external, and deliberately modified links retain native navigation', () => {
  const h = harness();
  for (const href of ['https://opule.test/inbox.html', 'https://other.test/demo.html']) {
    assert.equal(h.click(href).event.defaultPrevented, undefined);
  }
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    const result = h.click('https://opule.test/demo.html', options);
    assert.equal(result.event.defaultPrevented, options.defaultPrevented);
  }
  assert.equal(h.frames.length, 0);
});

test('failed frame loads expose a retry instruction and every website page wires the modal', () => {
  const h = harness();
  h.click('https://opule.test/demo.html');
  const frame = h.frames[0];
  frame.contentDocument = null;
  frame.listeners.load();
  assert.equal(h.status.hidden, false);
  assert.match(h.status.textContent, /could not load/);
  for (const page of ['index', 'listing', 'sell', 'register', 'auth', 'inbox']) {
    assert.match(readFileSync(new URL('../../' + page + '.html', import.meta.url), 'utf8'), /src="assets\/phone-preview\.js"/);
  }
});
