import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function node() {
  const attributes = new Map();
  return {
    children: [], listeners: {}, style: { setProperty() {} }, classList: { add() {} },
    setAttribute: (name, value) => attributes.set(name, value),
    getAttribute: name => attributes.get(name), removeAttribute: name => attributes.delete(name),
    addEventListener(name, callback) { this.listeners[name] = callback; },
    focus() { this.focused = true; }, scrollIntoView() { this.scrolledIntoView = true; }
  };
}

test('application steps validate before advancing, keep values, and reveal invalid fields on submit', () => {
  const form = node();
  const items = [node(), node(), node()];
  const progress = { ...node(), children: items, querySelector: () => items.find(item => item.getAttribute('aria-current')) };
  const fields = [false, true, false].map(valid => ({
    valid, value: 'Keep this value', checkValidity() { return this.valid; }, reportValidity() { this.reported = true; }
  }));
  const headings = [node(), node(), node()];
  const steps = fields.map((field, index) => ({ ...node(), querySelectorAll: () => [field], querySelector: () => headings[index] }));
  const buttons = { '[data-step-back]': node(), '[data-step-next]': node(), '[type="submit"]': node() };
  form.querySelectorAll = () => steps;
  form.querySelector = selector => selector === '.form-progress' ? progress : buttons[selector];
  const OPULE = {};
  runInNewContext(readFileSync(new URL('../../assets/navigation.js', import.meta.url), 'utf8'), {
    OPULE, document: { querySelectorAll: () => [] },
    MutationObserver: class { observe() {} }, window: { addEventListener() {}, scrollTo() {} }
  });
  OPULE.initFormSteps(form);
  const next = () => buttons['[data-step-next]'].listeners.click();
  assert.deepEqual(steps.map(step => step.hidden), [false, true, true]);
  next();
  assert.equal(fields[0].reported, true);
  assert.equal(steps[0].hidden, false);
  fields[0].valid = true;
  next();
  assert.deepEqual(steps.map(step => step.hidden), [true, false, true]);
  assert.equal(headings[1].focused, true);
  assert.equal(progress.scrolledIntoView, true);
  buttons['[data-step-back]'].listeners.click();
  assert.equal(fields[0].value, 'Keep this value');
  next();
  next();
  assert.equal(buttons['[type="submit"]'].hidden, false);
  const submit = () => {
    const event = { preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
    form.listeners.submit(event);
    return event;
  };
  assert.equal(submit().stopped, true);
  assert.equal(fields[2].reported, true);
  fields[2].valid = true;
  fields[0].valid = false;
  assert.equal(submit().prevented, true);
  assert.deepEqual(steps.map(step => step.hidden), [false, true, true]);
  fields[0].valid = true;
  assert.equal(submit().prevented, true);
  assert.deepEqual(steps.map(step => step.hidden), [true, false, true]);
  next();
  assert.equal(submit().prevented, undefined);
});

test('all pages load shared navigation and reduced motion disables document transitions', () => {
  for (const page of ['index', 'listing', 'register', 'sell', 'auth', 'demo']) {
    const html = readFileSync(new URL('../../' + page + '.html', import.meta.url), 'utf8');
    assert.ok(html.indexOf('assets/app.js') < html.indexOf('assets/navigation.js'));
    assert.match(html, /src="assets\/navigation\.js"/);
  }
  const styles = readFileSync(new URL('../../assets/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /prefers-reduced-motion: reduce\)\s*\{\s*@view-transition\s*\{\s*navigation: none/);
});
