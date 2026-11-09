import { randomUUID, randomBytes } from 'node:crypto';
import { tokenHash } from './crypto.js';

const tables = new Set(['users', 'sellers', 'listings', 'venues', 'conversations', 'messages', 'handovers', 'rewards', 'notifications', 'settings']);

export function store(pool, cipher) {
  function check(table) { if (!tables.has(table)) throw new Error('Unknown record type'); }
  function decode(table, row) { return row ? cipher.open(row.payload, `${table}:${row.id}`) : null; }
  return {
    pool,
    cipher,
    decode,
    async get(table, id) {
      check(table);
      return decode(table, (await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [id])).rows[0]);
    },
    async all(table) {
      check(table);
      return (await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows.map(row => decode(table, row));
    },
    async put(table, value, columns = {}, client = pool) {
      check(table);
      const row = { id: value.id, ...columns, payload: cipher.seal(value, `${table}:${value.id}`) };
      const keys = Object.keys(row);
      const allowed = new Set(['id', 'payload', 'role', 'demo', 'status', 'seller_id', 'buyer_id', 'listing_id', 'conversation_id', 'sender_id', 'created_at', 'user_id', 'completed', 'login_hash', 'password_hash']);
      if (keys.some(key => !allowed.has(key))) throw new Error('Invalid record columns');
      const conflict = table === 'settings' ? 'id,user_id' : 'id';
      await client.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT (${conflict}) DO UPDATE SET ${keys.filter(key => key !== 'id').map(key => `${key}=EXCLUDED.${key}`).join(',')}`, keys.map(key => row[key]));
    },
    async atomic(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async session(userId) {
      const token = randomBytes(32).toString('hex');
      await pool.query("DELETE FROM sessions WHERE expires_at <= now()");
      await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')", [tokenHash(token), userId]);
      return token;
    },
    id: randomUUID
  };
}
