#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resourcesDir = join(__dirname, '..', 'resources');

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = (table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function makePng(size) {
  const r = 14;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.18;
  const ringR = [size * 0.55, size * 0.4, size * 0.28];
  const bars = [
    { x: 0.32, h: 0.42 },
    { x: 0.4, h: 0.58 },
    { x: 0.48, h: 0.3 },
    { x: 0.56, h: 0.45 },
    { x: 0.64, h: 0.62 },
    { x: 0.72, h: 0.36 },
  ];
  const w = size;
  const h = size;
  const radius = size * 0.18;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const off = y * (w * 4 + 1) + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inRounded = (() => {
        const qx = Math.max(Math.abs(x - cx) - (w / 2 - radius), 0);
        const qy = Math.max(Math.abs(y - cy) - (h / 2 - radius), 0);
        return qx * qx + qy * qy <= radius * radius;
      })();
      let R = 2;
      let G = 74;
      let B = 110;
      let A = 255;
      if (!inRounded) {
        raw[off] = 0;
        raw[off + 1] = 0;
        raw[off + 2] = 0;
        raw[off + 3] = 0;
        continue;
      }
      const gradT = (x + y) / (w + h);
      R = Math.round(2 + (2 - 2) * gradT);
      G = Math.round(74 + (132 - 74) * gradT);
      B = Math.round(110 + (199 - 110) * gradT);
      for (const rr of ringR) {
        const d = Math.abs(dist - rr);
        if (d < size * 0.012) {
          const t = (rr - ringR[2]) / (ringR[0] - ringR[2]);
          R = Math.round(125 + (56 - 125) * t);
          G = Math.round(211 + (189 - 211) * t);
          B = Math.round(252 + (248 - 252) * t);
          A = Math.round(220 + 35 * t);
        }
      }
      if (dist < innerR) {
        R = 250;
        G = 250;
        B = 250;
        A = 255;
      }
      const barW = size * 0.04;
      for (const bar of bars) {
        const bx = bar.x * w;
        const bw = barW;
        const byTop = cy - (bar.h * size) / 2;
        const byBot = cy + (bar.h * size) / 2;
        if (x >= bx - bw / 2 && x <= bx + bw / 2 && y >= byTop && y <= byBot) {
          R = 250;
          G = 250;
          B = 250;
          A = 230;
        }
      }
      raw[off] = R;
      raw[off + 1] = G;
      raw[off + 2] = B;
      raw[off + 3] = A;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idatData = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

const sizes = [16, 32, 48, 64, 128, 256, 512];
for (const s of sizes) {
  const png = makePng(s);
  writeFileSync(join(resourcesDir, `icon-${s}.png`), png);
  console.log(`Wrote icon-${s}.png (${png.length} bytes)`);
}
writeFileSync(join(resourcesDir, 'icon.png'), makePng(512));
console.log('Done.');
