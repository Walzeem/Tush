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

// --- Pure Node PNG Generator for Tush Cyan-to-Purple Droplet Icon ---
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

function createTushIconPng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const center = (size - 1) / 2;
  const radius = size * 0.46;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0; // filter type 0
    const ny = (y - center) / radius;

    for (let x = 0; x < size; x++) {
      const nx = (x - center) / radius;
      const pxOffset = rowOffset + 1 + x * 4;

      // Rounded squircle distance
      const dist = Math.pow(Math.abs(nx), 2.6) + Math.pow(Math.abs(ny), 2.6);
      if (dist > 1.0) {
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
        continue;
      }

      // Dark navy squircle background (#060a17)
      let r = 6;
      let g = 10;
      let b = 23;
      const a = 255;

      // Tush droplet / T-gem in the center
      const t = (nx + ny + 1.4) / 2.8; // gradient factor 0..1
      const gradR = Math.round(0 * (1 - t) + 124 * t);
      const gradG = Math.round(240 * (1 - t) + 58 * t);
      const gradB = Math.round(255 * (1 - t) + 237 * t);

      // Droplet shape math
      const dy = ny + 0.08;
      const dropletWidth = dy < 0 ? (0.55 + dy * 0.72) : 0.55 * Math.sqrt(Math.max(0, 1 - dy * dy * 2.1));
      const inDroplet = dy >= -0.68 && dy <= 0.65 && Math.abs(nx) <= Math.max(0.06, dropletWidth);

      // Border glow
      const inBorder = dist > 0.84;

      if (inDroplet || inBorder) {
        r = gradR;
        g = gradG;
        b = gradB;
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
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

