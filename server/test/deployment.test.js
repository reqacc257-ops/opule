import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import pg from 'pg';
import { createApp } from '../app.js';
import { createRuntime } from '../runtime.js';
import handler from '../../api/index.js';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test('pages use same-origin scripts and fonts without inline executable markup', () => {
  for (const file of ['index.html', 'listing.html', 'register.html', 'sell.html', 'demo.html', 'auth.html']) {
    const html = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, file);
    assert.doesNotMatch(html, /\bon\w+\s*=/i, file);
    assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\/[^"']+["'][^>]*(?:rel=["']stylesheet|><\/script>)/i, file);
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/, file);
  }
  for (const name of ['index', 'listing', 'register', 'sell']) {
    const script = readFileSync(join(root, 'assets', name + '-page.js'), 'utf8');
    assert.doesNotMatch(script, /\bonclick\s*=|javascript:|\beval\s*\(|new Function\s*\(/i, name);
  }
  const styles = readFileSync(join(root, 'assets', 'styles.css'), 'utf8');
  for (const font of ['bodoni-moda.ttf', 'hanken-grotesk.ttf']) {
    assert.ok(styles.includes(`fonts/${font}`));
    const bytes = readFileSync(join(root, 'assets', 'fonts', font));
    assert.equal(bytes.readUInt32BE(0), 0x00010000, 'Valid TrueType font');
  }
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const csp = vercel.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self'; script-src-attr 'none'/);
  assert.match(csp, /font-src 'self'/);
});

test('Render Blueprint pins Node and prompts for production secrets', () => {
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const render = readFileSync(join(root, 'render.yaml'), 'utf8');
  assert.equal(readFileSync(join(root, '.node-version'), 'utf8').trim(), '24.22.1');
  assert.equal(packageJson.engines.node, '>=24 <25');
  assert.match(packageJson.scripts.start, /--env-file-if-exists=\.env/);
  assert.match(render, /runtime: node/);
  assert.match(render, /startCommand: node server\/index\.js/);
  assert.match(render, /healthCheckPath: \/api\/health/);
  assert.match(render, /key: DATABASE_URL\r?\n\s+sync: false/);
  assert.match(render, /key: DATA_ENCRYPTION_KEY\r?\n\s+sync: false/);
  assert.match(render, /key: DATABASE_TLS\r?\n\s+value: "true"/);
  assert.match(render, /key: ENABLE_DEMO\r?\n\s+value: "false"/);
  assert.match(render, /key: ENABLE_SAMPLE_ACCOUNTS\r?\n\s+value: "true"/);
});

test('hosted sample accounts sign in securely and cannot change the real catalog or other conversations', async t => {
  let currentUser = 'alex';
  const users = {
    alex: { id: 'alex', name: 'Alex S.', role: 'seller', demo: true },
    jamie: { id: 'jamie', name: 'Jamie R.', role: 'buyer', demo: true },
    real: { id: 'real', name: 'Real seller', role: 'seller', demo: false }
  };
  const db = {
    all: async () => [],
    session: async id => 'sample-session-' + id,
    get: async (table, id) => {
      if (table === 'users') return users[id];
      if (table === 'conversations' && id === 'sample') return { id, buyerId: 'jamie', sellerId: 'alex', demo: true };
      if (table === 'conversations' && id === 'private') return { id, buyerId: 'real', sellerId: 'someone-else', demo: false };
      return null;
    },
    pool: { query: async sql => ({ rows: sql.includes('FROM sessions') ? [{ user_id: currentUser }] : [] }) },
    put: async (table, value) => value
  };
  const app = createApp(db, {
    root, origin: 'https://opule.onrender.com', production: true, demo: false,
    sampleAccounts: true, key: 'a'.repeat(64), areas: ['baliwag']
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = { Origin: 'https://opule.onrender.com', 'Content-Type': 'application/json' };
  for (const id of ['jamie', 'alex']) {
    const response = await fetch(origin + '/api/demo/login', { method: 'POST', headers, body: JSON.stringify({ id }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.id, id);
    assert.match(response.headers.get('set-cookie'), /__Host-opule=.*HttpOnly; Secure; SameSite=Strict/);
  }
  const invalid = await fetch(origin + '/api/demo/login', { method: 'POST', headers, body: JSON.stringify({ id: 'real' }) });
  assert.equal(invalid.status, 400);
  const bootstrap = await fetch(origin + '/api/bootstrap');
  assert.equal((await bootstrap.json()).demoEnabled, true);
  const authenticated = { ...headers, Cookie: '__Host-opule=test-token' };
  for (const [path, method] of [['/api/listings', 'POST'], ['/api/seller', 'PUT'], ['/api/seller', 'DELETE']]) {
    const response = await fetch(origin + path, { method, headers: authenticated, body: '{}' });
    assert.equal(response.status, 403);
  }
  const privateChat = await fetch(origin + '/api/messages/private', { headers: authenticated });
  assert.equal(privateChat.status, 404);
  const handover = { conversationId: 'sample', buyerId: 'jamie', sellerId: 'alex', completed: false };
  const saved = await fetch(origin + '/api/handovers/test', { method: 'PUT', headers: authenticated, body: JSON.stringify(handover) });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).demo, true);
  currentUser = 'real';
  const realUser = await fetch(origin + '/api/handovers/test', { method: 'PUT', headers: authenticated, body: JSON.stringify(handover) });
  assert.equal(realUser.status, 403);
});

test('Vercel builds only public pages and assets and routes every API path to the shared function', async () => {
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.outputDirectory, 'dist');
  assert.deepEqual(config.rewrites, [{ source: '/api/:path*', destination: '/api/index' }]);
  assert.ok(config.functions['api/index.js'].includeFiles.includes('server/**'));
  await import('../build-static.js');
  const output = join(root, config.outputDirectory);
  assert.deepEqual(readdirSync(output).sort(), ['assets', 'auth.html', 'demo.html', 'index.html', 'listing.html', 'register.html', 'sell.html']);
  for (const file of readdirSync(output).filter(file => file.endsWith('.html'))) {
    const html = readFileSync(join(output, file), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
      assert.ok(existsSync(join(output, match[1])), `${file} requires ${match[1]}`);
    }
  }
});

test('runtime rejects missing database and insecure production configuration before connecting', async () => {
  await assert.rejects(createRuntime({}), /APP_ORIGIN/);
  await assert.rejects(createRuntime({ RENDER_EXTERNAL_URL: 'https://opule.onrender.com' }), /DATABASE_URL/);
  await assert.rejects(createRuntime({ APP_ORIGIN: 'http://localhost:3000' }), /DATABASE_URL/);
  await assert.rejects(createRuntime({
    APP_ORIGIN: 'http://localhost:3000', NODE_ENV: 'production', DATABASE_TLS: 'true'
  }), /Production requires HTTPS/);
});

test('hosted samples are seeded only when explicitly enabled', async t => {
  const statements = [];
  const query = async sql => {
    statements.push(sql);
    return { rows: [] };
  };
  t.mock.method(pg.Pool.prototype, 'query', query);
  t.mock.method(pg.Pool.prototype, 'connect', async () => ({ query, release() {} }));
  const env = {
    NODE_ENV: 'production', APP_ORIGIN: 'https://opule.onrender.com',
    DATABASE_URL: 'postgresql://localhost/opule_test', DATA_ENCRYPTION_KEY: 'a'.repeat(64),
    DATABASE_TLS: 'true', ENABLE_DEMO: 'false'
  };
  for (const enabled of [false, true]) {
    statements.length = 0;
    const runtime = await createRuntime({ ...env, ENABLE_SAMPLE_ACCOUNTS: String(enabled) });
    try {
      assert.equal(statements.some(sql => sql.startsWith('INSERT INTO users')), enabled);
      assert.equal(statements.some(sql => sql.startsWith('INSERT INTO conversations')), enabled);
    } finally { await runtime.pool.end(); }
  }
});

test('Render always uses production mode even when NODE_ENV is missing or development', async t => {
  t.mock.method(pg.Pool.prototype, 'query', async () => ({ rows: [] }));
  for (const nodeEnv of [undefined, 'development', 'production']) {
    const env = {
      RENDER: 'true',
      RENDER_EXTERNAL_URL: 'https://opule.onrender.com',
      DATABASE_URL: 'postgresql://localhost/opule_test',
      DATA_ENCRYPTION_KEY: 'a'.repeat(64),
      DATABASE_TLS: 'true',
      ENABLE_DEMO: 'false',
      ...(nodeEnv ? { NODE_ENV: nodeEnv } : {})
    };
    const runtime = await createRuntime(env);
    try {
      assert.equal(runtime.production, true);
      assert.equal(runtime.origin, env.RENDER_EXTERNAL_URL);
      assert.equal(runtime.pool.options.ssl.rejectUnauthorized, true);
    } finally {
      await runtime.pool.end();
    }
    await assert.rejects(createRuntime({ ...env, ENABLE_DEMO: 'true' }), /Production requires HTTPS/);
    await assert.rejects(createRuntime({ ...env, DATABASE_TLS: 'false' }), /Production requires HTTPS/);
  }
});

test('function startup failures return uncached JSON and allow initialization to be retried', async t => {
  const previous = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
    await new Promise(resolve => server.close(resolve));
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/bootstrap`);
    assert.equal(response.status, 503);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match((await response.json()).error, /API could not start/);
  }
});

test('API routes serve JSON, protect private operations, and serve CSS without exposing server files', async t => {
  const db = {
    all: async () => [],
    pool: { query: async () => ({ rows: [] }) }
  };
  const app = createApp(db, { root, origin: 'http://localhost:3000', production: false, demo: false, key: 'a'.repeat(64), areas: ['baliwag'], vercel: true });
  assert.equal(app.get('trust proxy'), 1);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/api/bootstrap', '/api/health']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    if (path.endsWith('health')) assert.deepEqual(body, { ok: true });
    else assert.deepEqual(body, { listings: [], venues: [], user: null, demoEnabled: false });
  }
  for (const path of ['/api/records/sellers', '/api/messages/alex-jamie-L1']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 401);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  for (const [path, method, status] of [['/api/seller', 'PUT', 401], ['/api/listings', 'POST', 401], ['/api/settings/buyer-area', 'PUT', 401], ['/api/rewards/test', 'POST', 403], ['/api/handovers/test', 'PUT', 403]]) {
    const response = await fetch(origin + path, {
      method, headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: '{}'
    });
    assert.equal(response.status, status);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  const invalid = await fetch(origin + '/api/auth/register', {
    method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: 'invalid'
  });
  assert.equal(invalid.status, 400);
  assert.equal(typeof (await invalid.json()).error, 'string');
  const css = await fetch(origin + '/assets/styles.css');
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  assert.equal(await css.text(), readFileSync(join(root, 'assets', 'styles.css'), 'utf8'));
  const html = await fetch(origin + '/');
  assert.equal(html.status, 200);
  const csp = html.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /script-src-attr 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval|fonts\.googleapis|fonts\.gstatic|sha256-/);
  for (const path of ['/assets/index-page.js', '/assets/fonts/bodoni-moda.ttf', '/assets/fonts/hanken-grotesk.ttf']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    await response.arrayBuffer();
  }
  for (const path of ['/api/missing', '/server/runtime.js', '/.env', '/DATABASE.md']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
});

test('authentication rate limits return JSON instead of text', async t => {
  const app = createApp({ pool: { query: async () => ({ rows: [] }) } }, {
    root, origin: 'http://localhost:3000', production: false, demo: false, key: 'a'.repeat(64), areas: ['baliwag']
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/auth/login`;
  for (let index = 0; index < 16; index++) {
    const response = await fetch(url, {
      method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: '{}'
    });
    assert.equal(response.status, index < 15 ? 400 : 429);
    assert.equal(typeof (await response.json()).error, 'string');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('the Vercel handler forwards original API paths to Express after database initialization', async t => {
  const names = ['APP_ORIGIN', 'NODE_ENV', 'DATABASE_URL', 'DATA_ENCRYPTION_KEY', 'ENABLE_DEMO', 'DATABASE_TLS', 'VERCEL'];
  const previous = new Map(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, {
    APP_ORIGIN: 'https://opule-2f65.vercel.app',
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/opule_test',
    DATA_ENCRYPTION_KEY: 'a'.repeat(64),
    ENABLE_DEMO: 'false',
    DATABASE_TLS: 'true',
    VERCEL: '1'
  });
  let schemaQueries = 0;
  t.mock.method(pg.Pool.prototype, 'query', async sql => {
    if (sql.includes('CREATE TABLE')) schemaQueries++;
    return { rows: [] };
  });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await new Promise(resolve => server.close(resolve));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const [path, status] of [['/api/bootstrap', 200], ['/api/health', 200], ['/api/records/sellers', 401], ['/api/missing', 404]]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type'), /application\/json/);
    await response.json();
  }
  assert.equal(schemaQueries, 1, 'Requests reuse one initialized runtime');
});
