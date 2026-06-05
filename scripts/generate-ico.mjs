#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resourcesDir = join(__dirname, '..', 'resources');

function makeIco(sizes) {
  const pngs = sizes.map((s) => ({ size: s, data: readFileSync(join(resourcesDir, `icon-${s}.png`)) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dirEntries = [];
  let dataOffset = 6 + pngs.length * 16;
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    e[0] = p.size === 256 ? 0 : p.size;
    e[1] = p.size === 256 ? 0 : p.size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(p.data.length, 8);
    e.writeUInt32LE(dataOffset, 12);
    dirEntries.push(e);
    dataOffset += p.data.length;
  }
  return Buffer.concat([header, ...dirEntries, ...pngs.map((p) => p.data)]);
}

const ico = makeIco([16, 32, 48, 64, 128, 256]);
writeFileSync(join(resourcesDir, 'icon.ico'), ico);
console.log(`Wrote icon.ico (${ico.length} bytes)`);
