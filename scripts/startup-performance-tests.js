'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainRoot = path.join(root, 'src', 'main');
const manifestPath = path.join(mainRoot, 'assets', 'token-icons', 'manifest.json');
const bundlePath = path.join(mainRoot, 'renderer.bundle.js');

assert(fs.existsSync(manifestPath), 'Prepared icon manifest must exist before startup performance tests run.');
assert(fs.existsSync(bundlePath), 'Prepared renderer bundle must exist before startup performance tests run.');

const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);
assert(manifest.version >= 3, 'Startup-optimized icon manifest must use the local-file format.');
assert.strictEqual(manifest.assetMode, 'local-svg-files');
assert(!manifestRaw.includes('data:image/svg+xml;base64,'),
  'Bulk SVG bytes must not be embedded into the runtime lookup manifest.');

const minimums = { tokens: 1000, networks: 100, wallets: 30, exchanges: 20 };
let iconCount = 0;
for (const [category, minimum] of Object.entries(minimums)) {
  const entries = Object.entries(manifest[category] || {});
  assert(entries.length >= minimum, `${category} icon coverage must not be reduced to improve startup.`);
  iconCount += entries.length;
  for (const [key, source] of entries) {
    assert(String(source).startsWith(`./assets/token-icons/${category}/`) && String(source).endsWith('.svg'),
      `${category}:${key} must resolve to an on-demand packaged SVG.`);
    const absolute = path.resolve(mainRoot, source);
    assert(absolute.startsWith(path.join(mainRoot, 'assets', 'token-icons') + path.sep),
      `${category}:${key} local icon path must stay inside SafeLedger assets.`);
    assert(fs.existsSync(absolute), `${category}:${key} packaged local SVG must exist.`);
  }
}

// These are generous ceilings, not micro-benchmarks. They prevent a future
// refactor from accidentally putting thousands of base64 SVG payloads back in
// the startup parse path while allowing normal code/catalog growth.
const manifestBytes = fs.statSync(manifestPath).size;
const bundleBytes = fs.statSync(bundlePath).size;
assert(manifestBytes < 2 * 1024 * 1024,
  `Startup icon lookup manifest is unexpectedly large (${manifestBytes} bytes).`);
assert(bundleBytes < 8 * 1024 * 1024,
  `Renderer startup bundle is unexpectedly large (${bundleBytes} bytes).`);
const bundle = fs.readFileSync(bundlePath, 'utf8');
assert(!bundle.includes('data:image/svg+xml;base64,PHN2Zy'),
  'Renderer startup bundle must not contain the bulk prepared SVG catalog as base64 data.');

// Requiring modules that main.js loads before BrowserWindow creation must not
// parse the Web3 icon manifest. The catalog is allowed to load later when a
// template/icon is actually requested.
const web3Path = require.resolve('../src/main/web3-icons.js');
delete require.cache[web3Path];
const profileSetupPath = require.resolve('../src/main/profile-setup.js');
delete require.cache[profileSetupPath];
require(profileSetupPath);
assert.strictEqual(require.cache[web3Path], undefined,
  'Loading Profile setup during main-process bootstrap must not load the Web3 icon catalog.');

const tokenIconsPath = require.resolve('../src/main/token-icons.js');
delete require.cache[web3Path];
delete require.cache[tokenIconsPath];
require(tokenIconsPath);
assert.strictEqual(require.cache[web3Path], undefined,
  'Loading token icon helpers during main-process bootstrap must not load the Web3 icon catalog until first lookup.');

console.log(
  `PASS SafeLedger startup performance contract: ${iconCount} offline icons stay available on demand; ` +
  `manifest ${Math.round(manifestBytes / 1024)} KiB, renderer bundle ${Math.round(bundleBytes / 1024)} KiB, ` +
  `and pre-window feature imports do not eagerly load the icon catalog.`
);