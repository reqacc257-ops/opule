import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function catalog() {
  const OPULE = {};
  runInNewContext(readFileSync(new URL('../../assets/discovery-data.js', import.meta.url), 'utf8'), { OPULE, URL });
  return OPULE.discovery;
}

test('discovery contains 128 distinct products from twelve sources and twenty-seven stores', () => {
  const { items, stores } = catalog();
  assert.equal(items.length, 128);
  assert.equal(stores.length, 27);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  assert.equal(new Set(items.map(item => item.url)).size, items.length);
  assert.equal(new Set(items.map(item => item.image)).size, items.length);
  assert.equal(new Set(items.map(item => item.storeId)).size, 12);
  assert.equal(new Set(stores.map(store => store.id)).size, stores.length);
  assert.equal(new Set(stores.map(store => store.url)).size, stores.length);
  for (const store of stores) {
    assert.equal(new URL(store.url).protocol, 'https:');
    assert.equal(store.reviewed, '2026-11-10');
    assert.ok(store.note.length > 10);
  }
  for (const item of items) {
    const store = stores.find(store => store.id === item.storeId);
    const url = new URL(item.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.origin, new URL(store.url).origin);
    assert.equal(url.search, '', 'No affiliate or tracking parameters added');
    assert.ok(url.pathname.startsWith('/products/') || /^\/en\/(bags|watches)\/.+\.html$/.test(url.pathname));
    assert.ok(item.price === null || (Number.isFinite(item.price) && item.price > 0));
    assert.equal(item.currency, store.currency);
    assert.match(item.observed, /^2026-\d{2}-\d{2}$/);
    assert.ok(item.observed <= '2026-11-10');
    assert.match(item.evidence, /reference$/);
    assert.ok(!item.inStock, 'No unsupported stock claims');
    const image = new URL(item.image);
    assert.equal(image.protocol, 'https:');
    assert.ok(['theorangebox.ph', 'www.fashionphile.com', 'madisonavenuecouture.com', 'medias.collectorsquare.com',
      'www.annsfabulousfinds.com', 'bagista.co.uk', 'www.redeluxe.com', 'luxsecondchance.com', 'luxuryhelsinki.fi', 'aranaz.ph', 'r2r.ph', 'www.gentry.ph'].includes(image.hostname));
    if (item.storeId === 'collector') {
      assert.ok(image.pathname.includes('/' + url.pathname.match(/-(\d+)\.html$/)[1] + '/'));
    } else assert.equal(image.hostname, url.hostname);
    assert.equal(item.imageReviewed, '2026-11-10');
  }
});

test('discovery search and filters combine without mixing currency prices', () => {
  const { filterItems } = catalog();
  assert.equal(filterItems({ region: 'Philippines' }).length, 35);
  assert.equal(filterItems({ category: 'Watches' }).length, 21);
  assert.equal(filterItems({ category: 'Jewelry' }).length, 2);
  assert.equal(filterItems({ query: '  JUSTE UN CLOU  ' }).length, 1);
  assert.equal(filterItems({ query: 'orange', brand: 'Prada', category: 'Bags' }).length, 1);
  assert.equal(filterItems({ currency: 'USD', maxPrice: 5000, store: 'fashionphile' }).length, 1);
  assert.equal(filterItems({ currency: 'PHP', store: 'orange', maxPrice: 20000 }).length, 1);
  assert.equal(filterItems({ currency: 'EUR', store: 'collector', maxPrice: 1500 }).length, 3);
  assert.equal(filterItems({ currency: 'USD', region: 'Philippines' }).length, 0);
  assert.equal(filterItems({ query: '<img onerror=alert(1)>' }).length, 0);
  const sorted = filterItems({ currency: 'USD', sort: 'price-low' });
  assert.equal(sorted[0].price, 400);
  assert.equal(sorted.at(-1).price, null, 'Unknown prices sort last');
  assert.deepEqual(
    Array.from(filterItems({ sort: 'price-low' }), item => item.id),
    Array.from(filterItems({}), item => item.id),
    'No misleading numeric sort across different currencies'
  );
});

test('Gentry leads discovery without being mislabelled as Philippine-made or sponsored', () => {
  const { stores, items, filterItems } = catalog();
  assert.equal(stores[0].id, 'gentry');
  assert.equal(items[0].storeId, 'gentry');
  assert.equal(filterItems({ store: 'gentry' }).length, 12);
  assert.equal(filterItems({ store: 'gentry', madeIn: 'Philippines' }).length, 0);
  assert.ok(filterItems({ store: 'gentry' }).every(item => item.currency === 'PHP' && item.category === 'Watches'));
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="browse">\s*<section class="gentry-feature"/);
  assert.match(html, /Editorial spotlight, not a paid placement or partnership/);
  assert.doesNotMatch(html, /srsltid/);
});

test('spotlight assigns half to Gentry and equal remaining shares only to stores with products', () => {
  const { stores, items, selectSpotlight } = catalog();
  assert.equal(selectSpotlight(0).id, 'gentry');
  assert.equal(selectSpotlight(0.499999999).id, 'gentry');
  assert.equal(selectSpotlight(0.5).id, stores[1].id);
  assert.equal(selectSpotlight(0.999999999).id, stores.at(-1).id);
  const others = stores.filter(store => store.id !== 'gentry' && items.some(item => item.storeId === store.id));
  assert.equal(others.length, 11);
  const counts = new Map(stores.map(store => [store.id, 0]));
  const samples = others.length * 200;
  for (let index = 0; index < samples; index++) {
    const id = selectSpotlight((index + 0.5) / samples).id;
    assert.ok(items.filter(item => item.storeId === id).length >= 3, 'Every spotlight can show three products from its own store');
    counts.set(id, counts.get(id) + 1);
  }
  assert.equal(counts.get('gentry'), samples / 2);
  for (const store of others) assert.equal(counts.get(store.id), 100);
  for (const store of stores.filter(store => !items.some(item => item.storeId === store.id))) assert.equal(counts.get(store.id), 0);
  for (const sample of [-1, 1, NaN, Infinity]) assert.throws(() => selectSpotlight(sample), /Spotlight sample/);
});

test('Philippine production is evidence-backed and separate from store location', () => {
  const { items, filterItems } = catalog();
  const local = filterItems({ madeIn: 'Philippines' });
  assert.equal(local.length, 15);
  assert.equal(filterItems({ madeIn: 'Philippines', store: 'aranaz' }).length, 8);
  assert.equal(filterItems({ madeIn: 'Philippines', store: 'r2r' }).length, 7);
  assert.equal(filterItems({ madeIn: 'Philippines', store: 'orange' }).length, 0);
  assert.equal(filterItems({ query: 'made in Philippines' }).length, 15);
  assert.equal(filterItems({ madeIn: 'Philippines', currency: 'USD' }).length, 0);
  assert.equal(filterItems({ madeIn: 'Philippines', currency: 'PHP', maxPrice: 3000 }).length, 2);
  assert.equal(filterItems({ madeIn: 'Philippines', category: 'Accessories' }).length, 1);
  for (const item of local) {
    assert.equal(item.currency, 'PHP');
    assert.equal(new URL(item.originEvidence).origin, new URL(item.url).origin);
    if (item.storeId === 'aranaz') assert.equal(item.originEvidence, item.url);
    else assert.equal(item.originEvidence, 'https://r2r.ph/');
  }
  assert.ok(items.filter(item => !local.includes(item)).every(item => item.madeIn === null && item.originEvidence === null));
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="discover-origin"/);
  assert.match(html, /id="browse-ph"/);
  assert.match(html, /id="browse-all"/);
  assert.match(html, /id="featured-ph-grid"/);
  assert.match(html, /Filipino-made, thoughtfully found/);
  assert.match(html, /not independent certification/);
  const script = readFileSync(new URL('../../assets/discovery.js', import.meta.url), 'utf8');
  assert.match(script, /origin\.href = item\.originEvidence/);
  assert.match(script, /function renderFeaturedPhilippineItems/);
  assert.match(script, /el\('browse-all'\)\.addEventListener/);
});

test('new product sources preserve currencies, categories and source destinations', () => {
  const { filterItems } = catalog();
  for (const [store, count, currency] of [
    ['anns', 12, 'USD'], ['bagista', 12, 'GBP'], ['redeluxe', 12, 'PHP'],
    ['luxsecond', 12, 'CAD'], ['helsinki', 11, 'PHP']
  ]) {
    const items = filterItems({ store });
    assert.equal(items.length, count);
    assert.ok(items.every(item => item.currency === currency && item.evidence === 'Store catalog reference'));
  }
  assert.equal(filterItems({ category: 'Shoes' }).length, 1);
  assert.equal(filterItems({ store: 'bagista', currency: 'GBP', maxPrice: 1000 })[0].brand, 'Fendi');
  assert.equal(filterItems({ store: 'luxsecond', query: 'Marni', maxPrice: 400, currency: 'CAD' }).length, 1);
  assert.equal(filterItems({ store: 'rebag' }).length, 0, 'Directory-only stores must not invent imported inventory');
});

test('public discovery works without accounts or the marketplace API and retains source disclosures', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /assets\/(?:database|phone-preview|index-page)\.js|href="(?:sell|register|demo|auth|inbox)\.html/);
  assert.match(html, /assets\/discovery-data\.js/);
  assert.match(html, /assets\/discovery\.js/);
  assert.match(html, /not a live stock feed/);
  assert.match(html, /not Opulé partners/);
  assert.match(html, /Product photos are served by and credited to their source stores/);
  const script = readFileSync(new URL('../../assets/discovery.js', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /\bfetch\(|OPULE\.db|OPULE\.ready/);
  assert.match(script, /localStorage\.setItem/);
  assert.match(script, /pageSize = 12/);
  assert.match(script, /storePageSize = 6/);
  assert.match(script, /options\('discover-store', sourceStores\)/);
  assert.match(script, /Directory only/);
  for (const control of ['store-search', 'store-region', 'store-coverage', 'store-previous', 'store-next', 'store-empty']) {
    assert.ok(html.includes('id="' + control + '"'));
  }
});

test('deployment image policies allow every source thumbnail without allowing arbitrary image hosts', () => {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const policy = vercel.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
  const img = policy.match(/img-src ([^;]+)/)[1];
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  for (const origin of new Set(catalog().items.map(item => new URL(item.image).origin))) {
    assert.ok(img.includes(origin), origin);
    assert.ok(app.includes("'" + origin + "'"), origin);
  }
  assert.doesNotMatch(img, /\*|(?:^| )https:(?: |$)/);
});

test('discovery has aligned actions and narrow-screen safe-area layouts', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /viewport-fit=cover/);
  const css = readFileSync(new URL('../../assets/discovery.css', import.meta.url), 'utf8');
  assert.match(css, /\.local-edit-actions \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /\.discovery-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /\.discovery-page \.market-layout \{ display: block; \}/);
  assert.match(css, /\.featured-ph-card \{ grid-template-columns: 104px minmax\(0, 1fr\); \}/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(html, /id="spotlight-grid"[^>]*tabindex="0"/);
  const script = readFileSync(new URL('../../assets/discovery.js', import.meta.url), 'utf8');
  assert.match(script, /var compact = matchMedia\('\(max-width: 1024px\)'\)/);
});

test('store search uses shared full-height controls with theme-aware placeholders', () => {
  const styles = readFileSync(new URL('../../assets/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /input\[type="text"\], input\[type="search"\][^{]+\{[^}]+min-height: 48px;/);
  const css = readFileSync(new URL('../../assets/discovery.css', import.meta.url), 'utf8');
  assert.match(css, /\.discovery-page input::placeholder \{ color: var\(--text-secondary\); opacity: 1; \}/);
  assert.match(css, /\.store-filters \.field \{[^}]*margin-bottom: 0;/);
});

test('discovery uses account-free shopping-destination branding and explicitly inactive ad slots', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /Many stores\.<br>One destination\./);
  assert.match(html, /No sign-up\. No checkout here\./);
  assert.doesNotMatch(html, /href="(?:auth|register|sell)\.html/);
  const slots = Array.from(html.matchAll(/data-ad-slot="([^"]+)"/g), match => match[1]);
  assert.equal(slots.length, 6);
  assert.equal(new Set(slots).size, 6);
  assert.deepEqual(slots, ['sidebar', 'collection-banner', 'collection-footer', 'brand-spotlight', 'services-spotlight', 'stores-footer']);
  const browse = html.slice(html.indexOf('<section data-page-view="browse"'), html.indexOf('<section data-page-view="saved"'));
  assert.equal((browse.match(/class="discovery-intro"/g) || []).length, 1);
  assert.ok(browse.indexOf('class="discovery-intro"') > browse.indexOf('data-ad-slot="services-spotlight"'));
  assert.match(browse, /class="discovery-intro"[\s\S]*<\/div>\s*<\/section>\s*$/);
  assert.match(html, /No ad network, paid sponsor, tracking pixel or advertising cookies are active/);
  assert.match(html, /kept separate from product results/);
  assert.doesNotMatch(html, /adsbygoogle|googlesyndication|doubleclick/);
});
