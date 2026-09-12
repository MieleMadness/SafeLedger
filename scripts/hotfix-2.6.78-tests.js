'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 78, 'The login-background contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.78-tests.js'),
  'The 2.6.78 login-background regression must remain in the main regression chain.');

const palette = read('src/main/css/appearance-palettes.css');
const collapse = read('src/main/column-collapse-ui.js');

assert(palette.includes('html[data-theme="light"],\nhtml[data-theme="colorful"] {\n  --sl-login-backdrop: url("../assets/login-background-light.jpg");\n}'),
  'Light and Colorful must share the same local login artwork.');
assert(palette.includes('html[data-theme="dark"] {\n  --sl-login-backdrop: url("../assets/login-background-dark.jpg");\n}'),
  'Dark must use the matching dark login artwork.');
assert(palette.includes('.app-shell[data-login-mode="true"]') &&
  palette.includes('background-size: cover;') &&
  palette.includes('background-repeat: no-repeat;'),
  'Login artwork must fill the login shell without tiling.');
assert(palette.includes('.app-shell[data-login-mode="true"] .app-cell') &&
  palette.includes('background-color: transparent !important;'),
  'Workspace cells must expose the login artwork only while login mode is active.');
assert(!palette.includes('http://') && !palette.includes('https://'),
  'Login artwork must not introduce remote runtime resources.');

assert(collapse.includes("shell.setAttribute('data-login-mode', 'true');"),
  'collapseForLogin must explicitly activate login artwork state.');
assert(collapse.includes("shell.removeAttribute('data-login-mode');"),
  'revealAfterLogin must remove login artwork state before restoring the workspace.');

function jpegDimensions(data) {
  assert(Buffer.isBuffer(data), 'JPEG artwork must be read as binary data.');
  assert(data.length >= 4 && data[0] === 0xff && data[1] === 0xd8,
    'JPEG artwork must start with the SOI marker.');

  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < data.length) {
    while (offset < data.length && data[offset] !== 0xff) offset++;
    while (offset < data.length && data[offset] === 0xff) offset++;
    if (offset >= data.length) break;

    const marker = data[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > data.length) break;

    const segmentLength = data.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > data.length) break;
    if (frameMarkers.has(marker)) {
      assert(segmentLength >= 7, 'JPEG frame metadata must include image dimensions.');
      return {
        height: data.readUInt16BE(offset + 3),
        width: data.readUInt16BE(offset + 5)
      };
    }
    offset += segmentLength;
  }
  throw new Error('JPEG dimensions could not be read from the bundled login artwork.');
}

for (const relative of [
  'src/main/assets/login-background-light.jpg',
  'src/main/assets/login-background-dark.jpg'
]) {
  const data = fs.readFileSync(path.join(root, relative));
  assert.strictEqual(data[0], 0xff, `${relative} must be a JPEG asset.`);
  assert.strictEqual(data[1], 0xd8, `${relative} must be a JPEG asset.`);
  assert.strictEqual(data[data.length - 2], 0xff, `${relative} must end with a JPEG EOI marker.`);
  assert.strictEqual(data[data.length - 1], 0xd9, `${relative} must end with a JPEG EOI marker.`);
  const dimensions = jpegDimensions(data);
  assert(dimensions.width >= 640 && dimensions.height >= 360,
    `${relative} must be large enough to serve as login background artwork.`);
  const ratio = dimensions.width / dimensions.height;
  assert(Math.abs(ratio - (16 / 9)) < 0.02,
    `${relative} must preserve the intended widescreen login composition.`);
}
assert(pkg.build.files.includes('src/**/*'),
  'Electron packaging must continue including the local login artwork.');

const release = read('RELEASE-2.6.78.md').toLowerCase();
for (const phrase of [
  'light and colorful',
  'dark',
  'login',
  'local',
  'offline',
  '1280x720'
]) {
  assert(release.includes(phrase), `2.6.78 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.77-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'src/main/column-collapse-ui.js',
  'scripts/hotfix-2.6.78-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} uses bundled theme-aware login artwork only during login.`);
