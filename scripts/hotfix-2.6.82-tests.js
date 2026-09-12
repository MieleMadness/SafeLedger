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
assert(parts[2] >= 82, 'The visible login-wallpaper cascade repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.82-tests.js'),
  'The 2.6.82 login-wallpaper cascade regression must remain in the main regression chain.');

const theme = read('src/main/css/app-theme.css');
const palette = read('src/main/css/appearance-palettes.css');
const dividers = read('src/main/css/workspace-dividers.css');

assert(theme.includes('.dark4bg { background: var(--sl-bg) !important;'),
  'The base theme Detail-column background shorthand must remain documented by the regression.');

const scopedRule = palette.match(/\.app-shell\[data-login-mode="true"\] \.detail-column\s*\{([\s\S]*?)\}/);
assert(scopedRule, 'Login wallpaper must remain scoped to the Detail/display column.');
const rule = scopedRule[1];
for (const declaration of [
  'background-color: var(--sl-bg) !important;',
  'background-image: var(--sl-login-backdrop) !important;',
  'background-position: 72% center !important;',
  'background-repeat: no-repeat !important;',
  'background-size: cover !important;'
]) {
  assert(rule.includes(declaration), `The login wallpaper rule must retain: ${declaration}`);
}
assert(!/border(?:-color)?\s*:/.test(rule),
  'The wallpaper repair must not override or hide the existing column divider border.');
assert(!palette.includes('.app-shell[data-login-mode="true"] .app-cell'),
  'Login mode must not make every workspace cell transparent again.');

assert(dividers.includes('border-right: 1px solid color-mix(in srgb, currentColor 14%, transparent) !important;'),
  'The existing workspace column dividers must remain active.');

for (const relative of [
  'src/main/assets/login-background-light.svg',
  'src/main/assets/login-background-dark.svg'
]) {
  const svg = read(relative);
  for (const marker of ['₿', 'Ethereum crystal', 'Solana mark', 'USDC-style coin', '<!-- wallet -->', '<!-- lock -->']) {
    assert(svg.includes(marker), `${relative} must retain visible crypto/security artwork marker: ${marker}`);
  }
  assert(svg.includes('id="softGlow"') && svg.includes('id="tinyGlow"'),
    `${relative} must keep the soft-glow treatment.`);
}

const release = read('RELEASE-2.6.82.md').toLowerCase();
for (const phrase of [
  'icons were not visible',
  'root cause',
  'important shorthand',
  'background-image',
  'display column',
  'column dividers',
  '72% center',
  'no authentication'
]) {
  assert(release.includes(phrase), `2.6.82 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.81-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.81-tests.js',
  'scripts/hotfix-2.6.82-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} makes the login crypto wallpaper visible in the display column without removing workspace dividers.`);
