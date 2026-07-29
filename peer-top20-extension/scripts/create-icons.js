import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '..', 'src', 'icons');

// 1x1 blue PNG
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPP/nwADBwAMAogK9f8AAAAASUVORK5CYII=';

fs.mkdirSync(iconsDir, { recursive: true });
const buffer = Buffer.from(pngBase64, 'base64');
for (const name of ['icon16.png', 'icon48.png', 'icon128.png']) {
  fs.writeFileSync(path.join(iconsDir, name), buffer);
}

console.log('Icons created in src/icons');
