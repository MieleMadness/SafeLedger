'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 90, 'The 2.6.90 historical Chain Games sandbox-artwork repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.90-tests.js'),
  'The 2.6.90 regression repair must remain in the main regression chain.');

const gate262 = read('scripts/development-2.6.2-tests.js');
const gate263 = read('scripts/hotfix-2.6.3-tests.js');
assert(gate262.includes("chainArtwork.startsWith('./assets/chain-games-')"),
  'The 2.6.2 historical gate must continue accepting only the bundled Chain Games artwork family.');
assert(gate263.includes("serviceIcon.startsWith('./assets/chain-games-')"),
  'The 2.6.3 sandbox gate must validate the packaged Chain Games artwork family while Buffer is unavailable.');
assert(gate263.includes('global.Buffer = undefined'),
  'The original renderer-sandbox Buffer-unavailable contract must remain covered.');
assert(gate263.includes("!/^https?:\\/\\//i.test(serviceIcon)"),
  'The 2.6.3 gate must explicitly reject network Chain Games artwork.');
assert(gate263.includes("tokenIcon && tokenIcon.src === serviceIcon"),
  'CHAIN Assets must continue sharing the same local artwork source in the sandbox regression.');
assert(!gate263.includes("serviceIcon.startsWith('data:image/svg+xml;charset=utf-8,')"),
  'The retired inline-data-URL-only assertion must not return to the 2.6.3 gate.');

const release = read('RELEASE-2.6.90.md').toLowerCase();
for (const phrase of [
  'hotfix-2.6.3-tests.js',
  'global.buffer',
  'sandbox',
  'local `./assets/chain-games-*.svg`',
  'historical-test modernization',
  'no production application'
]) assert(release.includes(phrase), `2.6.90 release notes must mention: ${phrase}`);

for (const relative of [
  'scripts/development-2.6.2-tests.js',
  'scripts/hotfix-2.6.3-tests.js',
  'scripts/hotfix-2.6.88-tests.js',
  'scripts/hotfix-2.6.89-tests.js'
]) execFileSync(process.execPath, [path.join(root, relative)], { stdio: 'pipe' });

for (const relative of [
  'scripts/hotfix-2.6.3-tests.js',
  'scripts/hotfix-2.6.90-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} preserves sandbox-safe, fully local Chain Games artwork without the retired inline-only test assumption.`);
