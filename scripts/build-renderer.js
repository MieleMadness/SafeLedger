'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const output = path.join(root, 'src', 'main', 'renderer.bundle.js');
const artworkSourceDir = path.join(root, 'scripts', 'login-artwork');
const artworkOutputDir = path.join(root, 'src', 'main', 'assets');

const LOGIN_ARTWORK = [
  {
    name: 'dark',
    parts: ['dark-00.b64', 'dark-01.b64', 'dark-02.b64', 'dark-03.b64', 'dark-04.b64', 'dark-05.b64'],
    target: 'login-background-dark.webp',
    sha256: 'f77727039a57c5afb754310a627345558347dfdfe9b773342c5234fd1b2ec6db'
  },
  {
    name: 'light',
    parts: ['light-00.b64', 'light-01.b64', 'light-02.b64', 'light-03.b64'],
    target: 'login-background-light.webp',
    sha256: 'b65e45faf3763b62213276ddf32e688d8270f5327a108a317e54e6752418c9ba'
  }
];

function prepareLoginArtwork() {
  fs.mkdirSync(artworkOutputDir, { recursive: true });

  // These older representations either rendered incorrectly or are no longer
  // canonical. Remove them from local workspaces before writing the verified
  // generated assets so there is one runtime owner per Login background.
  for (const retired of [
    'login-background-dark.jpg',
    'login-background-light.jpg',
    'login-background-dark.svg',
    'login-background-light.svg'
  ]) {
    fs.rmSync(path.join(artworkOutputDir, retired), { force: true });
  }

  for (const artwork of LOGIN_ARTWORK) {
    const encoded = artwork.parts
      .map((part) => fs.readFileSync(path.join(artworkSourceDir, part), 'utf8').trim())
      .join('');

    if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error(`Login artwork source is not canonical base64: ${artwork.name}`);
    }

    const bytes = Buffer.from(encoded, 'base64');
    const isWebP = bytes.length >= 12
      && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isWebP) throw new Error(`Login artwork source did not decode to WebP: ${artwork.name}`);

    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== artwork.sha256) {
      throw new Error(`Login artwork hash mismatch for ${artwork.name}: expected ${artwork.sha256}, got ${digest}`);
    }

    fs.writeFileSync(path.join(artworkOutputDir, artwork.target), bytes);
  }
}

async function run() {
  prepareLoginArtwork();

  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'main', 'renderer-entry.js')],
    outfile: output,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: ['chrome150'],
    sourcemap: false,
    minify: false,
    legalComments: 'none'
  });

  const bundled = fs.readFileSync(output, 'utf8');
  for (const forbidden of [
    "require('electron')", 'require("electron")',
    "require('fs')", 'require("fs")',
    "require('path')", 'require("path")',
    "require('crypto')", 'require("crypto")',
    'node:fs', 'node:path', 'node:crypto'
  ]) {
    if (bundled.includes(forbidden)) throw new Error(`Sandbox renderer bundle contains forbidden runtime dependency: ${forbidden}`);
  }
  console.log('Prepared verified local Login artwork and SafeLedger renderer bundle with explicit preload bridge boundary.');
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
