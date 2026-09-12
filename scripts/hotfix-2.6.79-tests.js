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
assert(parts[2] >= 79, 'The 2.6.78 login-background regression repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.79-tests.js'),
  'The 2.6.79 regression repair must remain in the main regression chain.');

const gate78 = read('scripts/hotfix-2.6.78-tests.js');
assert(!gate78.includes('data.length > 20000'),
  'The arbitrary compressed-file byte-size threshold must stay removed.');
assert(gate78.includes('function jpegDimensions(data)'),
  'The login-artwork gate must validate JPEG image metadata instead of compressed byte size.');
assert(gate78.includes('data[data.length - 2]') && gate78.includes('data[data.length - 1]'),
  'The login-artwork gate must validate the JPEG EOI marker.');
assert(gate78.includes('dimensions.width >= 640') && gate78.includes('dimensions.height >= 360'),
  'The login-artwork gate must require a useful background-sized image.');
assert(gate78.includes("Math.abs(ratio - (16 / 9)) < 0.02"),
  'The login-artwork gate must preserve the intended widescreen composition.');

const release = read('RELEASE-2.6.79.md').toLowerCase();
for (const phrase of [
  'all three 2.6.78 platform workflows',
  'false positive',
  'compressed file byte size',
  'jpeg dimensions',
  'local/offline',
  'no production login behavior changes'
]) {
  assert(release.includes(phrase), `2.6.79 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.78-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.78-tests.js',
  'scripts/hotfix-2.6.79-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} validates login artwork by JPEG structure and composition instead of compressed file size.`);
