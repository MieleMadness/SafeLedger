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
assert(!gate78.includes('function jpegDimensions(data)'),
  'The historical JPEG parser must stay retired after the malformed binary artwork was removed.');
assert(gate78.includes('login-background-light.svg') && gate78.includes('login-background-dark.svg'),
  'The login-artwork gate must validate the current self-contained SVG assets.');
assert(gate78.includes('viewBox="0 0 1280 720"'),
  'The login-artwork gate must preserve the intended 16:9 source composition.');
assert(gate78.includes('must not contain scripts') && gate78.includes('must not reference remote content'),
  'The local SVG artwork gate must preserve the offline/static security boundary.');

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

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.79 regression repair while validating the current self-contained login artwork.`);
