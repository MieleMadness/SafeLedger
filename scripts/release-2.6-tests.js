'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(
  parts[0] === 2 && parts[1] === 6 && parts[2] >= 0,
  'SafeLedger 2.6 release gates must continue to apply to the 2.6.x development line.'
);

const readme = read('README.md');
assert(readme.includes('Current stable release: SafeLedger 2.6.0'),
  'README must continue identifying SafeLedger 2.6.0 as the current master release while 2.6.x work is developed separately.');
assert(readme.includes('Profile → Vault Item → Asset'),
  'README must preserve the 2.6 Vault Item hierarchy.');
assert(readme.includes('Windows x64 Portable EXE') && readme.includes('Linux x64 AppImage'),
  'README must document the implemented 2.6.0 stable release platforms.');
assert(!readme.includes('SafeLedger **2.6** is the next planned major/minor release'),
  'README must not describe 2.6 as a future release after promotion.');
assert(!readme.includes('SafeLedger 2.6 macOS Apple Silicon plan is maintained'),
  'README must not present the superseded macOS-only 2.6 plan as current.');

const release = read('RELEASE-2.6.md');
assert(release.includes('Release: 2.6.0'), 'RELEASE-2.6.md must preserve the promoted 2.6.0 release record.');
assert(release.includes('Vault Item Experience & Local Web3 Catalog'),
  '2.6 release notes must preserve the promoted Vault Item/Web3 catalog scope.');
assert(release.includes('macOS Apple Silicon') && release.includes('not represented as shipped support'),
  '2.6.0 release notes must continue to avoid claiming macOS support retroactively.');

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.0 release record, platform scope, and Vault Item hierarchy.`);
