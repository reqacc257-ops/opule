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
  await assert.rejects(createRuntime({ APP_ORIGIN: 'http://localhost:3000' }), /DATABASE_URL/);
  await assert.rejects(createRuntime({
    APP_ORIGIN: 'http://localhost:3000', NODE_ENV: 'production', DATABASE_TLS: 'true'
  }), /Production requires HTTPS/);
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
