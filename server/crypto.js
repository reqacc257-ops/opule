import { createCipheriv, createDecipheriv, randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);

export function encryption(keyHex) {
  if (!/^[a-f0-9]{64}$/i.test(keyHex || '')) throw new Error('DATA_ENCRYPTION_KEY must contain 64 hex characters');
  const key = Buffer.from(keyHex, 'hex');
  return {
    seal(value, context) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.');
    },
    open(value, context) {
      const [version, nonce, tag, body] = value.split('.');
      if (version !== 'v1') throw new Error('Unsupported encrypted record version');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'base64'));
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'));
    }
  };
}

export async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('Password must contain 12–128 characters');
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function passwordMatches(password, stored) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [, salt, expected] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
