// Generates PWA icons (192/512) without any external dependencies.
// Design: deep-navy rounded square, cyan orbit ring, glowing planet, tiny stars.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(size, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function render(x, y, size) {
  const u = x / size, v = y / size;
  const cx = 0.5, cy = 0.5;

  // Rounded-square mask
  const corner = 0.18;
  const dx = Math.max(corner - Math.min(u, 1 - u), 0);
  const dy = Math.max(corner - Math.min(v, 1 - v), 0);
  const dCorner = Math.hypot(dx, dy) - corner;
  const mask = smooth(0.008, -0.008, dCorner);

  // Background: deep navy vertical gradient
  const bgMix = smooth(0, 1, v);
  let r = 6 + (1 - bgMix) * 6, g = 10 + (1 - bgMix) * 14, b = 28 + (1 - bgMix) * 30;

  // Planet (bottom center-right), soft cyan-blue sphere
  const pDist = Math.hypot(u - 0.62, v - 0.66);
  const pShade = smooth(0.26, 0.0, pDist);
  r += pShade * 40; g += pShade * 160; b += pShade * 210;

  // Orbit ring: ellipse centered above planet
  const ex = (u - 0.5) / 0.30, ey = (v - 0.44) / 0.115;
  const eDist = Math.hypot(ex, ey);
  const ring = smooth(0.06, 0.0, Math.abs(eDist - 1));
  const ringRot = Math.atan2(ey, ex);
  const ringAlpha = ring * (Math.sin(ringRot) < 0.25 ? 1 : 0.55);
  r += ringAlpha * 60; g += ringAlpha * 220; b += ringAlpha * 240;

  // Central "crosshair" dot (ORBIT logo mark)
  const dot = smooth(0.05, 0.03, Math.hypot(u - 0.5, v - 0.42));
  r += dot * 120; g += dot * 235; b += dot * 250;

  // Fixed star specks
  const stars = [[0.18, 0.2], [0.3, 0.62], [0.78, 0.2], [0.86, 0.44], [0.2, 0.82], [0.6, 0.14]];
  for (const [sx, sy] of stars) {
    const sd = Math.hypot(u - sx, v - sy);
    const s = smooth(0.02, 0.004, sd) * 220;
    r += s; g += s + 30; b += s + 60;
  }

  const A = Math.round(mask * 255);
  return [Math.min(255, Math.round(r)), Math.min(255, Math.round(g)), Math.min(255, Math.round(b)), A];
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), png(size, render));
  console.log(`icon-${size}.png written`);
}
