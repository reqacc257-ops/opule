import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createApp } from '../app.js';
import { tokenHash } from '../crypto.js';

async function fixture(t) {
  const tables = new Map();
  const table = name => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  let queue = Promise.resolve();
  const db = {
    id: randomUUID, decode: (name, row) => row?.payload || null,
    get: async (name, id) => structuredClone(table(name).get(id)?.payload || null),
    all: async name => [...table(name).values()].map(row => structuredClone(row.payload)),
    put: async (name, value, columns = {}) => {
      table(name).set(value.id, { id: value.id, ...columns, payload: structuredClone(value) });
      return value;
    },
    atomic: work => {
      const task = queue.then(() => work(db.pool));
      queue = task.catch(() => {});
      return task;
    },
    pool: {
      query: async (sql, params = []) => {
        if (sql.includes('FROM sessions')) {
          const user = ['seller', 'other', 'buyer', 'stranger', 'pending', 'sample'].find(id => tokenHash(id) === params[0]);
          return { rows: user ? [{ user_id: user }] : [] };
        }
        const name = sql.match(/FROM (\w+)/)?.[1];
        assert.ok(name, 'Unexpected fixture query: ' + sql);
        let rows = [...table(name).values()];
        if (sql.includes('buyer_id=$1 OR seller_id=$1')) rows = rows.filter(row => row.buyer_id === params[0] || row.seller_id === params[0]);
        else if (params.length) {
          const column = sql.match(/WHERE (\w+)=\$1/)?.[1];
          assert.ok(column, 'Unexpected fixture predicate: ' + sql);
          rows = rows.filter(row => row[column] === params[0]);
        }
        if (sql.includes('ORDER BY created_at DESC')) rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        if (sql.includes('LIMIT 500')) rows = rows.slice(0, 500);
        if (sql.includes('LIMIT 1')) rows = rows.slice(0, 1);
        return { rows };
      }
    }
  };
  for (const id of ['seller', 'other', 'buyer', 'stranger', 'pending', 'sample']) {
    await db.put('users', { id, name: id + ' Private name', email: id + '@example.test', role: ['seller', 'other', 'pending', 'sample'].includes(id) ? 'seller' : 'buyer', demo: id === 'sample' });
  }
  for (const id of ['seller', 'other', 'sample', 'pending']) await db.put('sellers', { id, status: id === 'pending' ? 'pending' : 'verified' });
  const server = createApp(db, { root: process.cwd(), origin: 'http://localhost:3000', production: false,
    demo: false, sampleAccounts: true, key: 'a'.repeat(64), areas: ['baliwag'] }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const call = (path, method = 'GET', body, user = 'seller') => fetch(origin + '/api/' + path, {
    method, headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json', ...(user ? { Cookie: 'opule_session=' + user } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const details = { title: 'Real listing', category: 'Bags', condition: 'Excellent', price: 25000, meta: 'Seller description', area: 'baliwag' };
  const create = async () => {
    const response = await call('listings', 'POST', details);
    assert.equal(response.status, 201);
    return response.json();
  };
  return { db, call, details, create };
}

test('only approved real owners can publish and edit; sold and archived inventory has correct visibility', async t => {
  const { call, create, details, db } = await fixture(t);
  for (const [user, expected] of [[null, 401], ['buyer', 403], ['pending', 403], ['sample', 403]]) {
    assert.equal((await call('listings', 'POST', details, user)).status, expected);
  }
  for (const changes of [{ category: 'Anything' }, { condition: '<script>' }, { price: 1000.5 }, { area: 'unknown' }, { meta: 'x'.repeat(2001) }]) {
    assert.equal((await call('listings', 'POST', { ...details, ...changes })).status, 400);
  }
  const listing = await create();
  assert.equal(listing.status, 'active');
  assert.equal((await call('listings/' + listing.id, 'PATCH', { price: 45000 }, 'other')).status, 404);
  assert.equal((await call('listings/' + listing.id, 'PATCH', { status: 'invalid' })).status, 400);
  const response = await call('listings/' + listing.id, 'PATCH', { title: 'Updated piece', price: 46000, status: 'sold', sellerId: 'other', image: 'https://evil.example/x' });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.sellerId, 'seller');
  assert.equal(updated.image, undefined);
  assert.equal(updated.title, 'Updated piece');
  assert.equal(updated.price, 46000);
  assert.equal((await (await call('bootstrap', 'GET', undefined, null)).json()).listings[0].status, 'sold');
  await call('listings/' + listing.id, 'PATCH', { status: 'archived' });
  assert.equal((await (await call('bootstrap', 'GET', undefined, 'buyer')).json()).listings.length, 0);
  assert.equal((await (await call('bootstrap')).json()).listings[0].status, 'archived');
  await call('listings/' + listing.id, 'PATCH', { status: 'active' });
  assert.equal((await db.get('listings', listing.id)).status, 'active');
});

test('photo uploads are owner-only, decoded, resized and stripped of metadata; archived photos are private', async t => {
  const { call, create, db } = await fixture(t);
  const listing = await create();
  const image = await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#dacdbb' } }).jpeg().withMetadata().toBuffer();
  const body = { data: image.toString('base64') };
  assert.equal((await call('listings/' + listing.id + '/photo', 'PUT', body, 'other')).status, 404);
  assert.equal((await call('listings/' + listing.id + '/photo', 'PUT', { data: Buffer.from('<svg></svg>').toString('base64') })).status, 400);
  assert.equal(await db.get('listing_photos', listing.id), null);
  const uploaded = await call('listings/' + listing.id + '/photo', 'PUT', body);
  assert.equal(uploaded.status, 200);
  const value = await uploaded.json();
  assert.match(value.image, /^\/api\/listings\/.+\/photo\?v=/);
  const photo = await call('listings/' + listing.id + '/photo', 'GET', undefined, null);
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  const bad = await call('listings/' + listing.id + '/photo', 'PUT', { data: '%%%%' });
  assert.equal(bad.status, 400);
  assert.equal((await db.get('listings', listing.id)).image, value.image);
  await call('listings/' + listing.id, 'PATCH', { status: 'archived' });
  assert.equal((await call('listings/' + listing.id + '/photo', 'GET', undefined, 'buyer')).status, 404);
  assert.equal((await call('listings/' + listing.id + '/photo')).status, 200);
});

test('real listing conversations are idempotent and private; messages persist, notify and reject sender impersonation', async t => {
  const { call, create, db } = await fixture(t);
  const listing = await create();
  const path = 'conversations';
  assert.equal((await call(path, 'POST', { listingId: listing.id }, null)).status, 401);
  assert.equal((await call(path, 'POST', { listingId: listing.id }, 'sample')).status, 403);
  assert.equal((await call(path, 'POST', { listingId: listing.id }, 'seller')).status, 403);
  const requests = await Promise.all([call(path, 'POST', { listingId: listing.id }, 'buyer'), call(path, 'POST', { listingId: listing.id }, 'buyer')]);
  const first = await requests[0].json(), second = await requests[1].json();
  assert.equal(first.id, second.id);
  assert.equal((await db.all('conversations')).length, 1);
  const messagePath = 'messages/' + first.id;
  assert.equal((await call(messagePath, 'POST', { text: 'Forged', senderId: 'seller' }, 'buyer')).status, 403);
  assert.equal((await call(messagePath, 'POST', { text: 'Unauthorized' }, 'stranger')).status, 404);
  assert.equal((await call(messagePath, 'POST', { text: ' ' }, 'buyer')).status, 400);
  assert.equal((await call(messagePath, 'POST', { text: 'x'.repeat(2001) }, 'buyer')).status, 400);
  const sent = await call(messagePath, 'POST', { text: '  Is this piece available?  ' }, 'buyer');
  assert.equal(sent.status, 201);
  const message = await sent.json();
  assert.equal(message.senderId, 'buyer');
  assert.equal(message.text, 'Is this piece available?');
  assert.equal((await db.all('notifications'))[0].userId, 'seller');
  assert.equal((await call(messagePath, 'GET', undefined, 'stranger')).status, 404);
  const read = await (await call(messagePath)).json();
  assert.equal(read[0].text, message.text);
  assert.equal((await call(messagePath, 'POST', { text: 'Yes, I can share details.' })).status, 201);
  const inbox = await (await call('inbox', 'GET', undefined, 'buyer')).json();
  assert.equal(inbox[0].participantName, 'seller Private name');
  assert.equal(inbox[0].lastMessage.text, 'Yes, I can share details.');
  assert.equal(inbox[0].email, undefined);
  assert.equal((await (await call('inbox', 'GET', undefined, 'stranger')).json()).length, 0);
  await call('listings/' + listing.id, 'PATCH', { status: 'sold' });
  assert.equal((await call(path, 'POST', { listingId: listing.id }, 'stranger')).status, 409);
  await call('listings/' + listing.id, 'PATCH', { status: 'archived' });
  assert.equal((await call(messagePath, 'POST', { text: 'Existing thread remains open.' }, 'buyer')).status, 201);
  assert.equal((await (await call('inbox', 'GET', undefined, 'buyer')).json())[0].listingStatus, 'archived');
});

test('message history returns the latest 500 in chronological order, not the first 500', async t => {
  const { call, create, db } = await fixture(t);
  const listing = await create();
  const thread = await (await call('conversations', 'POST', { listingId: listing.id }, 'buyer')).json();
  for (let index = 0; index < 510; index++) {
    const createdAt = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
    await db.put('messages', { id: String(index), conversationId: thread.id, senderId: 'buyer', text: String(index), createdAt },
      { conversation_id: thread.id, created_at: createdAt });
  }
  const rows = await (await call('messages/' + thread.id)).json();
  assert.equal(rows.length, 500);
  assert.equal(rows[0].text, '10');
  assert.equal(rows.at(-1).text, '509');
});
