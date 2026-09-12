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
assert(parts[2] >= 83, 'The 2.6.83 historical login-wallpaper regression repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.83-tests.js'),
  'The 2.6.83 regression repair must remain in the main regression chain.');

const gate78 = read('scripts/hotfix-2.6.78-tests.js');
assert(gate78.includes('const scopedRule = palette.match'),
  'The historical 2.6.78 gate must inspect the scoped Detail-column rule instead of searching the whole stylesheet loosely.');
assert(gate78.includes('(?:\\s*!important)?'),
  'The historical gate must allow the later cascade repair to add !important without turning a valid UI fix red.');
assert(!gate78.includes("palette.includes('background-size: cover;')"),
  'The brittle exact background-size assertion must stay retired.');
assert(!gate78.includes("palette.includes('background-repeat: no-repeat;')"),
  'The brittle exact background-repeat assertion must stay retired.');

const palette = read('src/main/css/appearance-palettes.css');
const scopedRule = palette.match(/\.app-shell\[data-login-mode="true"\] \.detail-column\s*\{([\s\S]*?)\}/);
assert(scopedRule, 'The current login wallpaper must remain scoped to the Detail/display column.');
const rule = scopedRule[1];
assert(rule.includes('background-image: var(--sl-login-backdrop) !important;'),
  'The visible wallpaper cascade fix from 2.6.82 must remain active.');
assert(rule.includes('background-size: cover !important;') && rule.includes('background-repeat: no-repeat !important;'),
  'The wallpaper must continue covering the display column without tiling.');
assert(!/border(?:-color)?\s*:/.test(rule),
  'The wallpaper rule must not override the existing workspace dividers.');

const release = read('RELEASE-2.6.83.md').toLowerCase();
for (const phrase of [
  'all three 2.6.82',
  'hotfix-2.6.78-tests.js',
  'background-size',
  '!important',
  'historical regression',
  'no production ui changes'
]) {
  assert(release.includes(phrase), `2.6.83 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.78-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.82-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.78-tests.js',
  'scripts/hotfix-2.6.82-tests.js',
  'scripts/hotfix-2.6.83-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps the visible login wallpaper while the historical 2.6.78 gate accepts the required cascade priority.`);
