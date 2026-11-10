import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createHmac } from 'node:crypto';
import { join } from 'node:path';
import { passwordHash, passwordMatches, tokenHash } from './crypto.js';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function requireValue(condition, message, status = 400) { if (!condition) throw new HttpError(status, message); }
function text(value, max = 400) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }

export function createApp(db, config) {
  const app = express();
  app.disable('x-powered-by');
  if (config.vercel) app.set('trust proxy', 1);
  const production = config.production;
  const localDemoAllowed = config.demo && !production;
  const demoAllowed = localDemoAllowed || config.sampleAccounts === true;
  const cookieName = production ? '__Host-opule' : 'opule_session';
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000, path: '/' };
  const hashLogin = email => createHmac('sha256', config.key).update(email.trim().toLowerCase()).digest('hex');
  const htmlFiles = ['index.html', 'listing.html', 'register.html', 'sell.html', 'demo.html', 'auth.html'];
  app.use(helmet({
    strictTransportSecurity: production ? undefined : false,
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'none'"], styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"], imgSrc: ["'self'", 'data:'], mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"],
      upgradeInsecureRequests: production ? [] : null
    } }
  }));
  function rateLimitResponse(req, res) {
    res.set('Cache-Control', 'no-store').status(429).json({ error: 'Too many requests. Please wait and try again.' });
  }
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitResponse }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        requireValue(req.get('Origin') === config.origin, 'Request origin is not allowed', 403);
        requireValue(req.is('application/json'), 'JSON content type required', 415);
      }
      const match = (req.get('Cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='));
      if (match) {
        const token = match.slice(cookieName.length + 1);
        const result = await db.pool.query('SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()', [tokenHash(token)]);
        if (result.rows[0]) req.user = await db.get('users', result.rows[0].user_id);
      }
      next();
    } catch (error) { next(error); }
  });
  function authenticate(req) { requireValue(req.user, 'Sign in to access your account', 401); }
  function localDemo(req) {
    return Boolean(localDemoAllowed && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress));
  }
  function demo(req) {
    requireValue(localDemo(req) || (config.sampleAccounts && req.user?.demo === true), 'Demo controls are disabled', 403);
  }
  async function participant(req, id) {
    authenticate(req);
    const row = await db.get('conversations', id);
    requireValue(row && [row.buyerId, row.sellerId].includes(req.user.id), 'Conversation not found', 404);
    requireValue(!req.user.demo || row.demo === true, 'Sample accounts can only access sample conversations', 403);
    return row;
  }
  app.get('/api/bootstrap', async (req, res) => {
    res.json({ listings: await db.all('listings'), venues: await db.all('venues'), user: req.user || null, demoEnabled: demoAllowed, localDemoEnabled: localDemo(req) });
  });
  const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, handler: rateLimitResponse });
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const { name, email, password, role, area } = req.body;
    requireValue(text(name, 100) && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 && ['buyer', 'seller'].includes(role) && config.areas.includes(area), 'Enter valid account details');
    const hash = await passwordHash(password);
    const user = { id: db.id(), name: name.trim(), email: email.trim().toLowerCase(), role, area, demo: false };
    try { await db.put('users', user, { login_hash: hashLogin(email), password_hash: hash, role, demo: false }); }
    catch (error) { if (error.code === '23505') throw new HttpError(409, 'Account could not be created; try signing in'); throw error; }
    res.cookie(cookieName, await db.session(user.id), cookieOptions).status(201).json({ user });
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    requireValue(text(req.body.email, 254) && text(req.body.password, 128), 'Enter your email and password');
    const row = (await db.pool.query('SELECT * FROM users WHERE login_hash=$1', [hashLogin(req.body.email)])).rows[0];
    requireValue(row && await passwordMatches(req.body.password, row.password_hash), 'Invalid email or password', 401);
    const user = db.decode('users', row);
    res.cookie(cookieName, await db.session(user.id), cookieOptions).json({ user });
  });
  app.post('/api/auth/logout', async (req, res) => {
    const match = (req.get('Cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='));
    if (match) await db.pool.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(match.slice(cookieName.length + 1))]);
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined }).json({ ok: true });
  });
  app.post('/api/demo/login', authLimit, async (req, res) => {
    if (!config.sampleAccounts) demo(req);
    requireValue(['jamie', 'alex'].includes(req.body.id), 'Choose one of the two demo accounts');
    const user = await db.get('users', req.body.id);
    requireValue(user?.demo === true, 'Sample account is unavailable', 503);
    res.cookie(cookieName, await db.session(user.id), cookieOptions).json({ user });
  });
  app.get('/api/records/:table', async (req, res) => {
    authenticate(req);
    const table = req.params.table;
    if (table === 'users') {
      if (req.user.id === 'alex' && demoAllowed) return res.json((await db.all('users')).filter(user => user.demo && user.role === 'buyer'));
      return res.json([req.user]);
    }
    const clauses = {
      conversations: ['buyer_id=$1 OR seller_id=$1', req.user.id],
      handovers: ['conversation_id IN (SELECT id FROM conversations WHERE buyer_id=$1 OR seller_id=$1)', req.user.id],
      rewards: ['user_id=$1', req.user.id],
      notifications: ['user_id=$1', req.user.id],
      sellers: ['id=$1', req.user.id],
      settings: ['user_id=$1', req.user.id]
    };
    if (table === 'rewards' && req.user.id === 'alex' && demoAllowed) clauses.rewards = ['user_id IN (SELECT buyer_id FROM conversations WHERE seller_id=$1)', req.user.id];
    requireValue(clauses[table], 'Unknown record collection', 404);
    const result = await db.pool.query(`SELECT * FROM ${table} WHERE ${clauses[table][0]}`, [clauses[table][1]]);
    res.json(result.rows.map(row => db.decode(table, row)));
  });
  app.get('/api/messages/:conversationId', async (req, res) => {
    await participant(req, req.params.conversationId);
    const result = await db.pool.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at,id LIMIT 500', [req.params.conversationId]);
    res.json(result.rows.map(row => db.decode('messages', row)));
  });
  app.post('/api/messages/:conversationId', async (req, res) => {
    const conversation = await participant(req, req.params.conversationId);
    requireValue(text(req.body.text, 2000), 'Message must contain 1–2000 characters');
    let senderId = req.user.id;
    if (req.body.senderId && req.body.senderId !== senderId) {
      demo(req);
      requireValue(req.user.demo && [conversation.buyerId, conversation.sellerId].includes(req.body.senderId), 'Invalid simulated sender', 403);
      senderId = req.body.senderId;
    }
    const message = { id: db.id(), conversationId: conversation.id, senderId, text: req.body.text.trim(), createdAt: new Date().toISOString(), demo: req.user.demo };
    await db.atomic(async client => {
      await db.put('messages', message, { conversation_id: conversation.id, sender_id: senderId, created_at: message.createdAt }, client);
      await db.put('notifications', { id: message.id, userId: senderId === conversation.buyerId ? conversation.sellerId : conversation.buyerId, kind: 'message', conversationId: conversation.id, read: false, createdAt: message.createdAt }, { user_id: senderId === conversation.buyerId ? conversation.sellerId : conversation.buyerId }, client);
    });
    res.status(201).json(message);
  });
  app.put('/api/handovers/:id', async (req, res) => {
    demo(req);
    const conversation = await participant(req, req.body.conversationId);
    requireValue(req.user.demo && req.body.buyerId === conversation.buyerId && req.body.sellerId === conversation.sellerId, 'Invalid handover participants');
    const prior = await db.get('handovers', req.params.id);
    requireValue(!prior || prior.conversationId === conversation.id, 'Handover not found', 404);
    const value = { ...req.body, id: req.params.id, demo: true, updatedAt: new Date().toISOString() };
    requireValue(text(value.id, 100) && typeof value.completed === 'boolean', 'Invalid handover');
    requireValue(!value.venueAccepted || (value.proposedVenue && value.buyerAgreement && value.sellerAgreement), 'Both price approvals and a venue are required');
    if (value.proposedVenue) {
      requireValue(text(value.proposedVenue.name, 100) && text(value.proposedVenue.address, 250) && Number.isFinite(Date.parse(value.proposedVenue.time + ':00+08:00')), 'Invalid meeting plan');
    }
    requireValue(!value.completed || (value.venueAccepted && value.buyerAgreement && value.sellerAgreement), 'Agreement required before completion');
    requireValue(!prior?.completed || value.completed, 'Completed handovers cannot be reopened');
    await db.put('handovers', value, { conversation_id: conversation.id, buyer_id: conversation.buyerId, completed: value.completed });
    res.json(value);
  });
  app.post('/api/rewards/:id', async (req, res) => {
    demo(req);
    authenticate(req);
    await db.atomic(async client => {
      const result = await client.query('SELECT * FROM handovers WHERE id=$1 FOR UPDATE', [req.params.id]);
      const handover = db.decode('handovers', result.rows[0]);
      requireValue(handover && handover.completed, 'A completed handover is required');
      await participant(req, handover.conversationId);
      const exists = await client.query('SELECT id FROM rewards WHERE id=$1', [handover.id]);
      if (!exists.rows.length) await db.put('rewards', { id: handover.id, handoverId: handover.id, userId: handover.buyerId, stars: 1, demo: true }, { user_id: handover.buyerId }, client);
    });
    res.json({ ok: true });
  });
  app.put('/api/settings/:id', async (req, res) => {
    authenticate(req);
    requireValue(req.params.id === 'buyer-area' && config.areas.includes(req.body.value), 'Invalid account setting');
    await db.put('settings', { id: req.params.id, value: req.body.value }, { user_id: req.user.id });
    res.json({ ok: true });
  });
  app.put('/api/seller', async (req, res) => {
    authenticate(req);
    requireValue(!((production || config.sampleAccounts) && req.user.demo), 'Shared sample seller profiles cannot be changed', 403);
    requireValue(req.user.role === 'seller', 'A seller account is required', 403);
    requireValue(text(req.body.name, 100) && config.areas.includes(req.body.area) && text(req.body.email, 254) && text(req.body.phone, 30) && text(req.body.callSlot, 100), 'Enter valid seller application details');
    const prior = await db.get('sellers', req.user.id);
    const approved = req.body.status === 'verified';
    if (approved) { demo(req); requireValue(prior && req.user.demo, 'Only a pending demo application can be simulated'); }
    const seller = { ...req.body, id: req.user.id, userId: req.user.id, status: approved ? 'verified' : 'pending', demo: req.user.demo };
    await db.put('sellers', seller, { status: seller.status });
    res.json(seller);
  });
  app.delete('/api/seller', async (req, res) => {
    demo(req); authenticate(req);
    requireValue(!((production || config.sampleAccounts) && req.user.demo), 'Shared sample seller profiles cannot be reset', 403);
    const listings = await db.pool.query('SELECT id FROM listings WHERE seller_id=$1 LIMIT 1', [req.user.id]);
    requireValue(!listings.rows.length, 'Cannot reset a seller with existing listings', 409);
    await db.pool.query('DELETE FROM sellers WHERE id=$1', [req.user.id]);
    res.json({ ok: true });
  });
  app.post('/api/listings', async (req, res) => {
    authenticate(req);
    requireValue(!((production || config.sampleAccounts) && req.user.demo), 'Shared sample accounts cannot publish listings', 403);
    const seller = await db.get('sellers', req.user.id);
    requireValue(seller?.status === 'verified', 'Seller approval required', 403);
    const value = req.body;
    requireValue(text(value.title, 200) && Number.isSafeInteger(value.price) && value.price >= 1000 && value.price <= 100000000 && config.areas.includes(value.area), 'Invalid listing');
    const listing = { id: 'U' + db.id(), title: value.title.trim(), price: value.price, category: value.category, meta: value.meta, condition: value.condition, area: value.area, sellerId: req.user.id, mine: true, createdAt: new Date().toISOString() };
    await db.put('listings', listing, { seller_id: req.user.id });
    res.status(201).json(listing);
  });
  app.get('/api/health', async (req, res) => { await db.pool.query('SELECT 1'); res.json({ ok: true }); });
  app.use('/assets', express.static(join(config.root, 'assets'), { dotfiles: 'deny' }));
  for (const file of htmlFiles) app.get(file === 'index.html' ? ['/', '/index.html'] : '/' + file, (req, res) => res.sendFile(join(config.root, file)));
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    console.error('Request failed:', req.method, req.path, status, error.code || error.name);
    res.set('Cache-Control', 'no-store');
    res.status(status).json({ error: status >= 500 ? 'Server could not complete this operation' : error.message });
  });
  return app;
}
