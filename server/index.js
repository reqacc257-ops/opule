import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { encryption } from './crypto.js';
import { store } from './store.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const production = process.env.NODE_ENV === 'production';
const origin = process.env.APP_ORIGIN;
if (!origin || new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an exact origin');
if (production && (!origin.startsWith('https://') || process.env.DATABASE_TLS !== 'true' || process.env.ENABLE_DEMO === 'true')) throw new Error('Production requires HTTPS, verified database TLS, and disabled demo controls');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const ssl = process.env.DATABASE_TLS === 'true' ? {
  rejectUnauthorized: true,
  ...(process.env.DATABASE_CA_FILE ? { ca: readFileSync(process.env.DATABASE_CA_FILE, 'utf8') } : {})
} : false;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
pool.on('error', error => console.error('Database connection failed:', error.code || error.name));
const db = store(pool, encryption(process.env.DATA_ENCRYPTION_KEY));
await pool.query(readFileSync(join(root, 'server', 'schema.sql'), 'utf8'));
if (process.env.ENABLE_DEMO === 'true' && !production) await seed(db, root);
const areas = ['baliwag', 'pulilan', 'plaridel', 'malolos', 'calumpit', 'sanrafael', 'hagonoy', 'guiguinto', 'marilao', 'meycauayan', 'makati', 'qc', 'bgc', 'manila'];
const app = createApp(db, { root, origin, production, demo: process.env.ENABLE_DEMO === 'true', key: process.env.DATA_ENCRYPTION_KEY, areas });
const server = app.listen(Number(process.env.PORT || 3000), production ? '0.0.0.0' : '127.0.0.1', () => console.log(`Opule ready at ${origin}`));
async function close() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.on('SIGINT', close);
process.on('SIGTERM', close);
