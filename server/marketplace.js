import sharp from 'sharp';
import { createHash } from 'node:crypto';

const categories = ['Watches', 'Bags', 'Jewelry', 'Sneakers', 'Accessories', 'Other'];
const conditions = ['New', 'Excellent', 'Very good', 'Good', 'Fair'];

export function listingVisible(listing, user) {
  return listing.status !== 'archived' || listing.sellerId === user?.id;
}

export function installMarketplace(app, db, config, helpers) {
  const { authenticate, requireValue, text } = helpers;
  async function owner(req, client) {
    authenticate(req);
    requireValue(!req.user.demo && req.user.role === 'seller', 'A real seller account is required', 403);
    const listing = client
      ? db.decode('listings', (await client.query('SELECT * FROM listings WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0])
      : await db.get('listings', req.params.id);
    requireValue(listing && listing.sellerId === req.user.id && !listing.sample, 'Listing not found', 404);
    const seller = client
      ? db.decode('sellers', (await client.query('SELECT * FROM sellers WHERE id=$1', [req.user.id])).rows[0])
      : await db.get('sellers', req.user.id);
    requireValue(seller?.status === 'verified', 'Seller approval required', 403);
    return listing;
  }
  function validate(value) {
    requireValue(text(value.title, 200) && Number.isSafeInteger(value.price) && value.price >= 1000 &&
      value.price <= 100000000 && config.areas.includes(value.area) && categories.includes(value.category) &&
      conditions.includes(value.condition) && typeof value.meta === 'string' && value.meta.length <= 2000, 'Enter valid listing details');
    return { title: value.title.trim(), price: value.price, area: value.area, category: value.category,
      condition: value.condition, meta: value.meta.trim() };
  }
  app.post('/api/listings', async (req, res) => {
    authenticate(req);
    requireValue(!req.user.demo && req.user.role === 'seller', 'A real seller account is required', 403);
    const seller = await db.get('sellers', req.user.id);
    requireValue(seller?.status === 'verified', 'Seller approval required', 403);
    const listing = { ...validate(req.body), id: 'U' + db.id(), sellerId: req.user.id, status: 'active', createdAt: new Date().toISOString() };
    await db.put('listings', listing, { seller_id: req.user.id });
    res.status(201).json(listing);
  });
  app.patch('/api/listings/:id', async (req, res) => {
    let updated;
    await db.atomic(async client => {
      const listing = await owner(req, client);
      const status = req.body.status === undefined ? listing.status || 'active' : req.body.status;
      requireValue(['active', 'sold', 'archived'].includes(status), 'Invalid listing status');
      updated = { ...listing, ...validate({ ...listing, ...req.body }), status, updatedAt: new Date().toISOString() };
      await db.put('listings', updated, { seller_id: req.user.id }, client);
    });
    res.json(updated);
  });
  app.put('/api/listings/:id/photo', async (req, res) => {
    await owner(req);
    const encoded = req.body.data;
    requireValue(typeof encoded === 'string' && encoded.length <= 7_000_000 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(encoded), 'Choose a JPEG, PNG or WebP image up to 5 MB');
    const input = Buffer.from(encoded, 'base64');
    requireValue(input.length <= 5 * 1024 * 1024, 'Image must be 5 MB or smaller');
    let photo;
    try {
      const image = sharp(input, { limitInputPixels: 20_000_000, animated: false });
      const metadata = await image.metadata();
      requireValue(['jpeg', 'png', 'webp'].includes(metadata.format) && (!metadata.pages || metadata.pages === 1), 'Use a still JPEG, PNG or WebP image');
      photo = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    } catch (error) {
      if (error.status) throw error;
      console.warn('Listing photo rejected:', error.name);
      requireValue(false, 'Image could not be decoded. Use a still JPEG, PNG or WebP image under 20 megapixels');
    }
    let updated;
    await db.atomic(async client => {
      const listing = await owner(req, client);
      const version = db.id();
      updated = { ...listing, image: '/api/listings/' + encodeURIComponent(listing.id) + '/photo?v=' + encodeURIComponent(version), updatedAt: new Date().toISOString() };
      await db.put('listing_photos', { id: listing.id, data: photo.toString('base64') }, {}, client);
      await db.put('listings', updated, { seller_id: req.user.id }, client);
    });
    res.json(updated);
  });
  app.get('/api/listings/:id/photo', async (req, res) => {
    const listing = await db.get('listings', req.params.id);
    requireValue(listing && listingVisible(listing, req.user), 'Photo not found', 404);
    const photo = await db.get('listing_photos', listing.id);
    requireValue(photo, 'Photo not found', 404);
    res.set('Cache-Control', 'private, no-store').type('jpeg').send(Buffer.from(photo.data, 'base64'));
  });
  app.post('/api/conversations', async (req, res) => {
    authenticate(req);
    requireValue(req.user.role === 'buyer' && !req.user.demo, 'Use a real buyer account to contact a seller', 403);
    requireValue(text(req.body.listingId, 100), 'Choose a listing');
    let conversation;
    await db.atomic(async client => {
      const listing = db.decode('listings', (await client.query('SELECT * FROM listings WHERE id=$1 FOR UPDATE', [req.body.listingId])).rows[0]);
      requireValue(listing && !listing.sample && !listing.demo && (!listing.status || listing.status === 'active'), 'This listing is not available for new enquiries', 409);
      const seller = db.decode('users', (await client.query('SELECT * FROM users WHERE id=$1', [listing.sellerId])).rows[0]);
      requireValue(seller && !seller.demo && seller.id !== req.user.id, 'Seller is not available', 409);
      const id = 'C' + createHash('sha256').update(JSON.stringify([req.user.id, listing.id])).digest('hex');
      conversation = db.decode('conversations', (await client.query('SELECT * FROM conversations WHERE id=$1', [id])).rows[0]);
      if (!conversation) {
        conversation = { id, listingId: listing.id, buyerId: req.user.id, sellerId: listing.sellerId, demo: false, createdAt: new Date().toISOString() };
        await db.put('conversations', conversation, { buyer_id: req.user.id, seller_id: listing.sellerId, listing_id: listing.id }, client);
      }
    });
    res.json(conversation);
  });
  app.get('/api/inbox', async (req, res) => {
    authenticate(req);
    const records = await db.pool.query('SELECT * FROM conversations WHERE buyer_id=$1 OR seller_id=$1', [req.user.id]);
    const conversations = records.rows.map(row => db.decode('conversations', row))
      .filter(conversation => !req.user.demo || conversation.demo === true);
    const threads = await Promise.all(conversations.map(async conversation => {
      const [person, listing, latest] = await Promise.all([
        db.get('users', conversation.buyerId === req.user.id ? conversation.sellerId : conversation.buyerId),
        db.get('listings', conversation.listingId),
        db.pool.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [conversation.id])
      ]);
      return { ...conversation, participantName: person?.name || 'Unavailable account', listingTitle: listing?.title || 'Unavailable listing',
        listingStatus: listing?.status || 'active', lastMessage: latest.rows[0] ? db.decode('messages', latest.rows[0]) : null };
    }));
    threads.sort((a, b) => (b.lastMessage?.createdAt || b.createdAt || '').localeCompare(a.lastMessage?.createdAt || a.createdAt || ''));
    res.json(threads);
  });
}
