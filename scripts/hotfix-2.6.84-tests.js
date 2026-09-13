'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 87, 'The later 2.6.x candidate intentionally retires the 2.6.84 focused-column artwork.');

const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const palettes = read('src/main/css/appearance-palettes.css');
const dividers = read('src/main/css/workspace-dividers.css');

assert(!index.includes('column-focus-artwork.css'), 'The retired focused-column stylesheet must not be loaded.');
assert(!entry.includes('column-focus-artwork.js'), 'The retired focused-column runtime must not be bundled.');
for (const relative of [
  'src/main/column-focus-artwork.js',
  'src/main/css/column-focus-artwork.css',
  'src/main/assets/profile-column-focus.svg',
  'src/main/assets/vault-column-focus.svg',
  'src/main/assets/asset-column-focus.svg'
]) {
  assert(!exists(relative), `${relative} should stay retired after the solid-column rollback.`);
}

assert(palettes.includes('url("../assets/login-background-light.svg")'), 'The Light/Colorful sign-in wallpaper must remain.');
assert(palettes.includes('url("../assets/login-background-dark.svg")'), 'The Dark sign-in wallpaper must remain.');
assert(palettes.includes('.app-shell[data-login-mode="true"] .detail-column'), 'Sign-in wallpaper must remain scoped to the display column.');
assert(dividers.includes('border-right: 1px solid color-mix(in srgb, currentColor 14%, transparent) !important;'),
  'The original workspace column dividers must remain intact.');

console.log(`PASS SafeLedger ${pkg.version} retires the 2.6.84 navigation-column artwork while preserving the sign-in wallpaper and dividers.`);
