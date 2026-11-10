import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test('seller sidebar surfaces stay tonally close to the light workspace', () => {
  const shared = readFileSync(new URL('../../assets/styles.css', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../../assets/seller-studio.css', import.meta.url), 'utf8');
  const workspace = shared.match(/--surface:\s*(#[0-9a-f]{6});/)[1];
  for (const token of ['surface', 'surface-raised', 'surface-muted']) {
    const color = sidebar.match(new RegExp('--' + token + ':\\s*(#[0-9a-f]{6});'))[1];
    assert.ok(contrast(workspace, color) <= 1.25, `${token} must not create a dark block against the workspace`);
  }
});

function contrast(first, second) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const [file, selector] of [['styles.css', ':root'], ['demo.css', '.handover-page'], ['seller-studio.css', '.seller-page .studio-sidebar']]) {
  test(`${file} text, accents, and form borders meet contrast thresholds`, () => {
    const styles = readFileSync(new URL('../../assets/' + file, import.meta.url), 'utf8');
    const start = styles.indexOf(selector + ' {');
    assert.ok(start !== -1, 'Palette scope exists');
    const palette = styles.slice(start, styles.indexOf('}', start));
    const tokens = Object.fromEntries([...palette.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map(match => [match[1], match[2]]));
    for (const background of ['surface', 'surface-raised', 'surface-muted']) {
      for (const foreground of ['text', 'text-secondary', 'accent']) {
        assert.ok(contrast(tokens[foreground], tokens[background]) >= 4.5, `${foreground} on ${background}: minimum 4.5:1`);
      }
      assert.ok(contrast(tokens['control-line'], tokens[background]) >= 3, `Form border on ${background}: minimum 3:1`);
    }
  });
}
