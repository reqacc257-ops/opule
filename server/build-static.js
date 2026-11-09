import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'listing.html', 'register.html', 'sell.html', 'demo.html', 'auth.html']) {
  cpSync(join(root, file), join(output, file));
}
cpSync(join(root, 'assets'), join(output, 'assets'), { recursive: true });
