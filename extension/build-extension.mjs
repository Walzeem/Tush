// Automated Chrome Extension (Manifest V3) Builder for Tush Wallet
// Produces:
//   - extension/icons/icon-{16,32,48,128}.png
//   - extension/dist/ (Unpacked Chrome Extension ready for chrome://extensions)
//   - extension/tush-wallet-extension.zip & dashboard/public/tush-wallet-extension.zip

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DASHBOARD_DIR = path.join(ROOT_DIR, 'dashboard');
const EXT_DIR = __dirname;
const EXT_DIST = path.join(EXT_DIR, 'dist');
const ICONS_DIR = path.join(EXT_DIR, 'icons');

// --- Pure Node PNG generator for the Tush hang-tag icon ---
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Tush hang-tag mark, rasterised on the same 64x64 grid as dashboard/public/favicon.svg.
const INK = [7, 6, 13];
const LIME = [200, 255, 77];
const PINK = [255, 92, 219];

function quadPoints(p0, c, p1, n = 6) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    out.push([
      (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
      (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
    ]);
  }
  return out;
}

const TAG_POLY = [
  [18, 22], [27, 11], [37, 11], [46, 22], [46, 54],
  ...quadPoints([46, 54], [46, 58], [42, 58]),
  [22, 58],
  ...quadPoints([22, 58], [18, 58], [18, 54]),
];

const STRING_PTS = (() => {
  const P = [[29, 20.5], [27.5, 8], [15, 2.5], [6, 9]];
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const mt = 1 - t;
    pts.push([
      mt ** 3 * P[0][0] + 3 * mt * mt * t * P[1][0] + 3 * mt * t * t * P[2][0] + t ** 3 * P[3][0],
      mt ** 3 * P[0][1] + 3 * mt * mt * t * P[1][1] + 3 * mt * t * t * P[2][1] + t ** 3 * P[3][1],
    ]);
  }
  return pts;
})();

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function polyDist(poly, x, y, closed) {
  let d = Infinity;
  const n = closed ? poly.length : poly.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    d = Math.min(d, segDist(x, y, ax, ay, bx, by));
  }
  return d;
}

function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundRect(x, y, rx, ry, w, h, r) {
  const cx = rx + w / 2;
  const cy = ry + h / 2;
  const dx = Math.max(Math.abs(x - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h / 2 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

const COS12 = Math.cos((12 * Math.PI) / 180);
const SIN12 = Math.sin((12 * Math.PI) / 180);

/** Colour of one sample point on the 64-grid, or null for transparent. */
function sampleMark(gx, gy) {
  if (!inRoundRect(gx, gy, 0, 0, 64, 64, 16)) return null;
  // Same inner scale as favicon.svg: scale(0.86) about (32, 33)
  const x = (gx - 32) / 0.86 + 32;
  const y = (gy - 33) / 0.86 + 33;
  // Undo the tag's rotate(-12 32 34)
  const tx = (x - 32) * COS12 - (y - 34) * SIN12 + 32;
  const ty = (x - 32) * SIN12 + (y - 34) * COS12 + 34;
  const inTag = inPoly(TAG_POLY, tx, ty) || polyDist(TAG_POLY, tx, ty, true) <= 1.5;
  const inPunch = inRoundRect(tx, ty, 23, 19, 18, 7, 3.5) || inRoundRect(tx, ty, 28.5, 19, 7, 25, 3.5);
  if (inTag && !inPunch) return LIME;
  if (polyDist(STRING_PTS, x, y, false) <= 1.8) return PINK;
  return INK;
}

function createTushIconPng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const SS = 5; // supersampling per axis for clean edges at 16px
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const gx = ((x + (sx + 0.5) / SS) / size) * 64;
          const gy = ((y + (sy + 0.5) / SS) / size) * 64;
          const c = sampleMark(gx, gy);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const o = row + 1 + x * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

console.log('1. Generating Tush Wallet Chrome Extension icons (16, 32, 48, 128)...');
fs.mkdirSync(ICONS_DIR, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.png`), createTushIconPng(size));
}

console.log('2. Building Tush Wallet UI for Chrome Extension (relative asset paths)...');
execSync('npx vite build --base=./ --outDir ../extension/dist --emptyOutDir', {
  cwd: DASHBOARD_DIR,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_BASE: process.env.VITE_API_BASE || 'https://tush-backend-h586.onrender.com',
    VITE_NETWORK: process.env.VITE_NETWORK || 'testnet',
  },
});

console.log('3. Copying Manifest V3 scripts and icons into extension/dist...');
for (const file of ['manifest.json', 'background.js', 'content-script.js', 'inpage-provider.js']) {
  fs.copyFileSync(path.join(EXT_DIR, file), path.join(EXT_DIST, file));
}
fs.cpSync(ICONS_DIR, path.join(EXT_DIST, 'icons'), { recursive: true });

console.log('4. Creating tush-wallet-extension.zip...');
const zipPath = path.join(EXT_DIR, 'tush-wallet-extension.zip');
const publicZipPath = path.join(DASHBOARD_DIR, 'public', 'tush-wallet-extension.zip');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

try {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${EXT_DIST}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`cd "${EXT_DIST}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
  }
  fs.copyFileSync(zipPath, publicZipPath);
  console.log(`✓ Packaged Chrome Extension zip to:\n  - ${zipPath}\n  - ${publicZipPath}`);
} catch (err) {
  console.warn('Warning: Could not create .zip archive automatically:', err.message);
}

console.log(`✓ Unpacked Chrome Extension ready at: ${EXT_DIST}`);

