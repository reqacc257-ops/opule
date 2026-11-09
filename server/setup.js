import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import pg from 'pg';

const root = resolve('.');
const data = join(root, 'data', 'postgres');
const adminFile = join(root, 'data', 'bootstrap-password');
const phase = process.argv[2];
if (phase === 'initialize') {
  if (existsSync(join(data, 'PG_VERSION')) || existsSync(join(root, '.env'))) throw new Error('Existing configuration detected; refusing to overwrite');
  if (!process.env.PG_BIN) throw new Error('Set PG_BIN to your PostgreSQL bin directory');
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(adminFile, randomBytes(32).toString('hex'), { mode: 0o600 });
  const result = spawnSync(join(process.env.PG_BIN, 'initdb.exe'), ['-D', data, '-U', 'opule_admin', '--pwfile=' + adminFile, '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C'], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('PostgreSQL initialization failed');
  console.log('Database cluster initialized. Start postgres on 127.0.0.1:55432, then run setup.js configure.');
} else if (phase === 'configure') {
  if (existsSync(join(root, '.env'))) throw new Error('Refusing to overwrite .env');
  const pool = new pg.Pool({ host: '127.0.0.1', port: 55432, user: 'opule_admin', password: readFileSync(adminFile, 'utf8'), database: 'postgres' });
  const password = randomBytes(32).toString('hex');
  try {
    await pool.query(`CREATE ROLE opule LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    await pool.query('CREATE DATABASE opule OWNER opule');
    await pool.query('REVOKE CONNECT ON DATABASE opule FROM PUBLIC');
    await pool.query('GRANT CONNECT ON DATABASE opule TO opule');
    writeFileSync(join(root, '.env'), [
      'NODE_ENV=development', 'PORT=3000', 'APP_ORIGIN=http://localhost:3000',
      `DATABASE_URL=postgresql://opule:${password}@127.0.0.1:55432/opule`,
      'DATA_ENCRYPTION_KEY=' + randomBytes(32).toString('hex'), 'DATABASE_TLS=false', 'ENABLE_DEMO=true'
    ].join('\n') + '\n', { mode: 0o600 });
    console.log('Created non-superuser app role and private .env. Local database transport only; configure TLS before deployment.');
    unlinkSync(adminFile);
  } finally { await pool.end(); }
} else {
  throw new Error('Choose initialize or configure');
}
