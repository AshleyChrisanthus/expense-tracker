import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootIconsDir = path.resolve(__dirname, '../icons');
const publicIconsDir = path.resolve(__dirname, '../public/icons');

fs.mkdirSync(rootIconsDir, { recursive: true });
fs.mkdirSync(publicIconsDir, { recursive: true });

function createPng(size, isMaskable = false) {
  const width = size;
  const height = size;

  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const radius = isMaskable ? 0 : size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  // Safe zone for maskable icons is 80% (scale down to 0.75-0.8)
  const scale = isMaskable ? 0.72 : 0.95;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      let inShape = true;
      if (!isMaskable) {
        const dx = Math.max(0, Math.abs(x - cx + 0.5) - (cx - radius));
        const dy = Math.max(0, Math.abs(y - cy + 0.5) - (cy - radius));
        inShape = Math.sqrt(dx * dx + dy * dy) <= radius;
      }

      if (inShape) {
        // Obsidian dark background gradient (#0b0f17 -> #161f30)
        const grad = (x + y) / (width + height);
        const bgR = Math.round(11 + grad * 12);
        const bgG = Math.round(15 + grad * 18);
        const bgB = Math.round(23 + grad * 28);

        // Center coordinates normalized (-1 to 1)
        const nx = (x - cx) / (cx * scale);
        const ny = (y - cy) / (cy * scale);

        // Glassmorphic Card / Vault Emblem:
        // Outer card rounded rectangle: nx in [-0.7, 0.7], ny in [-0.52, 0.52]
        const cardCorner = 0.18;
        const cdx = Math.max(0, Math.abs(nx) - (0.68 - cardCorner));
        const cdy = Math.max(0, Math.abs(ny) - (0.50 - cardCorner));
        const inCard = Math.sqrt(cdx * cdx + cdy * cdy) <= cardCorner;

        // Card border highlight: thickness 0.035
        const inCardInner = Math.sqrt(
          Math.max(0, Math.abs(nx) - (0.65 - cardCorner)) ** 2 +
          Math.max(0, Math.abs(ny) - (0.47 - cardCorner)) ** 2
        ) <= cardCorner;

        // Chip / Vault emblem in upper-left of card: nx in [-0.52, -0.25], ny in [-0.32, -0.05]
        const inChip = nx >= -0.52 && nx <= -0.25 && ny >= -0.32 && ny <= -0.05;

        // Growth curve / vibrant emerald accent spark line across bottom half
        // Curved line: ny ~ 0.22 - 0.25 * (nx + 0.5)^1.2 with thickness
        const curveY = 0.24 - 0.28 * Math.pow(Math.max(-0.6, Math.min(0.6, nx + 0.6)) / 1.2, 1.5);
        const distToCurve = Math.abs(ny - curveY);
        const inCurve = distToCurve <= 0.055 && nx >= -0.50 && nx <= 0.52;

        // Peak spark node at (0.50, curveY)
        const sparkDist = Math.sqrt((nx - 0.50) ** 2 + (ny - curveY) ** 2);
        const inSpark = sparkDist <= 0.09;

        if (inSpark) {
          // Brilliant emerald/mint spark (#34d399 / #10b981)
          rawData[offset++] = 52;
          rawData[offset++] = 211;
          rawData[offset++] = 153;
          rawData[offset++] = 255;
        } else if (inCurve) {
          // Glowing emerald gradient
          const glow = (nx + 0.5) / 1.0;
          rawData[offset++] = Math.round(16 + glow * 36);
          rawData[offset++] = Math.round(185 + glow * 35);
          rawData[offset++] = Math.round(129 + glow * 40);
          rawData[offset++] = 255;
        } else if (inChip) {
          // Gold / Brass metallic chip (#fbbf24)
          rawData[offset++] = 251;
          rawData[offset++] = 191;
          rawData[offset++] = 36;
          rawData[offset++] = 255;
        } else if (inCard && !inCardInner) {
          // Glass card rim / soft glowing border
          rawData[offset++] = Math.round(100 + grad * 80);
          rawData[offset++] = Math.round(140 + grad * 90);
          rawData[offset++] = Math.round(200 + grad * 55);
          rawData[offset++] = 220;
        } else if (inCardInner) {
          // Dark glass frosted surface (#1a2233)
          const cardR = Math.round(22 + (1 - ny) * 16);
          const cardG = Math.round(30 + (1 - ny) * 20);
          const cardB = Math.round(48 + (1 - ny) * 32);
          rawData[offset++] = cardR;
          rawData[offset++] = cardG;
          rawData[offset++] = cardB;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = bgR;
          rawData[offset++] = bgG;
          rawData[offset++] = bgB;
          rawData[offset++] = 255;
        }
      } else {
        // Transparent outside rounded corners
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = chunk.subarray(4, 8 + len);
  const crc = crc32(crcTarget);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate PWA Icon suite
const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-512-maskable.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32.png', size: 32, maskable: false }
];

targets.forEach(t => {
  const buf = createPng(t.size, t.maskable);
  fs.writeFileSync(path.join(rootIconsDir, t.file), buf);
  fs.writeFileSync(path.join(publicIconsDir, t.file), buf);
  console.log(`Generated ${t.file} (${t.size}x${t.size}, ${buf.length} bytes)`);
});

console.log('✅ All PWA icons generated successfully in icons/ and public/icons/!');
