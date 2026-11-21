/**
 * Makes the site icons from icon-naga-t.png in the project root. They are only resized:
 * the image itself is never redrawn or recoloured. Run it when the icon changes: npm run assets
 */
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = new URL('../icon-naga-t.png', import.meta.url).pathname;
const out = new URL('../public/', import.meta.url);
const resize = (size) => sharp(source).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

await writeFile(new URL('icon-header.png', out), await resize(96));
await writeFile(new URL('favicon-64.png', out), await resize(64));
await writeFile(new URL('icon-192.png', out), await resize(192));
await writeFile(new URL('apple-touch-icon.png', out), await resize(180));

// favicon.ico: a single 64px PNG inside an ICO container.
const png64 = await resize(64);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 64;
header[7] = 64;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png64.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(new URL('favicon.ico', out), Buffer.concat([header, png64]));

console.log('Icons written to public/');
