import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join } from 'node:path';

export async function seed(db, root) {
  if (await db.get('users', 'alex')) return;
  const context = vm.createContext({});
  vm.runInContext(readFileSync(join(root, 'assets', 'app.js'), 'utf8'), context);
  const buyers = [
    { id: 'jamie', name: 'Jamie R.', firstName: 'Jamie', initials: 'JR', area: 'Baliwag', joined: 2025, transactions: 8, rating: '4.9/5 from 8 reviews', distanceKm: 2, verified: true, photo: 'assets/images/demo-buyer.jpg' },
    { id: 'mika', name: 'Mika L.', firstName: 'Mika', initials: 'ML', area: 'Baliwag', joined: 2026, transactions: 0, rating: 'No reviews yet', distanceKm: 5, verified: true, photo: null },
    { id: 'sam', name: 'Sam T.', firstName: 'Sam', initials: 'ST', area: 'Pulilan', joined: 2025, transactions: 3, rating: '4.7/5 from 3 reviews', distanceKm: 15, verified: false, photo: null },
    { id: 'dani', name: 'Dani C.', firstName: 'Dani', initials: 'DC', area: 'Malolos', joined: 2024, transactions: 15, rating: '4.8/5 from 12 reviews', distanceKm: 24, verified: true, photo: null }
  ];
  const chat = [
    ['buyer', 'Hi Alex! Is the sample Hermès Roulis 23 still available?'],
    ['seller', 'Hi {buyer}! Yes, the demo piece is available at ₱282,000. What would you like to know?'],
    ['buyer', 'Can I inspect the condition and included accessories before accepting it? I am in {area}, Bulacan.'],
    ['seller', 'Of course. For this sample, check the source listing for condition and accessories; nothing is authenticated here. You can inspect before accepting at our agreed public venue.'],
    ['buyer', 'Thanks! I would like to discuss meeting in Baliwag. Is ₱282,000 the final sample price?'],
    ['seller', 'Yes, this demo uses a fixed ₱282,000 price. If we both accept the offer and meeting intent, we can choose an Opulé suggestion or our own public venue together.']
  ];
  await db.atomic(async client => {
    await db.put('users', { id: 'alex', name: 'Alex S.', role: 'seller', area: 'baliwag', demo: true }, { role: 'seller', demo: true }, client);
    await db.put('sellers', { id: 'alex', userId: 'alex', status: 'verified', demo: true }, { status: 'verified' }, client);
    for (const buyer of buyers) await db.put('users', { ...buyer, role: 'buyer', demo: true }, { role: 'buyer', demo: true }, client);
    for (const listing of context.OPULE.SEED) await db.put('listings', { ...listing, sellerId: 'alex' }, { seller_id: 'alex' }, client);
    for (const venue of context.OPULE.SPOTS) await db.put('venues', venue, {}, client);
    for (const buyer of buyers) {
      const id = 'alex-' + buyer.id + '-L1';
      await db.put('conversations', { id, buyerId: buyer.id, sellerId: 'alex', listingId: 'L1', demo: true }, { buyer_id: buyer.id, seller_id: 'alex', listing_id: 'L1' }, client);
      for (let index = 0; index < chat.length; index++) {
        const [role, text] = chat[index];
        const message = { id: id + '-seed-' + index, conversationId: id, senderId: role === 'buyer' ? buyer.id : 'alex', text: text.replace('{buyer}', buyer.firstName).replace('{area}', buyer.area), createdAt: `2026-11-09T06:0${index}:00.000Z`, seeded: true, demo: true };
        await db.put('messages', message, { conversation_id: id, sender_id: message.senderId, created_at: message.createdAt }, client);
      }
    }
  });
}
