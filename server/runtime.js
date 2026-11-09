import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { encryption } from './crypto.js';
import { store } from './store.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export async function createRuntime(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const origin = env.APP_ORIGIN || env.RENDER_EXTERNAL_URL;
  if (!origin || new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an exact origin');
  if (production && (!origin.startsWith('https://') || env.DATABASE_TLS !== 'true' || env.ENABLE_DEMO === 'true')) throw new Error('Production requires HTTPS, verified database TLS, and disabled demo controls');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const cipher = encryption(env.DATA_ENCRYPTION_KEY);
  const ssl = env.DATABASE_TLS === 'true' ? {
    rejectUnauthorized: true,
    ...(env.DATABASE_CA_FILE ? { ca: readFileSync(env.DATABASE_CA_FILE, 'utf8') } : {})
  } : false;
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  pool.on('error', error => console.error('Database connection failed:', error.code || error.name));
  try {
    const db = store(pool, cipher);
    await pool.query(readFileSync(join(root, 'server', 'schema.sql'), 'utf8'));
    if (env.ENABLE_DEMO === 'true' && !production) await seed(db, root);
    const areas = ['baliwag', 'pulilan', 'plaridel', 'malolos', 'calumpit', 'sanrafael', 'hagonoy', 'guiguinto', 'marilao', 'meycauayan', 'makati', 'qc', 'bgc', 'manila'];
    const app = createApp(db, { root, origin, production, demo: env.ENABLE_DEMO === 'true', key: env.DATA_ENCRYPTION_KEY, areas, vercel: env.VERCEL === '1' });
    return { app, pool, origin, production };
  } catch (error) {
    await pool.end();
    throw error;
  }
}
