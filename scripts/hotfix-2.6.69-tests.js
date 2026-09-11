'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);
const spacingGate = read('scripts/hotfix-2.6.68-tests.js');
const release68 = read('RELEASE-2.6.68.md');
const release69 = read('RELEASE-2.6.69.md');

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 69, 'The 2.6.69 regression-gate correction must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.69-tests.js'));

assert(spacingGate.includes('const releaseLower = release.toLowerCase();'),
  'The 2.6.68 release-note assertion must normalize heading capitalization before checking semantics.');
assert(spacingGate.includes("releaseLower.includes('root cause')"),
  'The 2.6.68 gate must verify root-cause documentation without depending on exact capitalization.');
assert(!spacingGate.includes("assert(release.includes('root cause'))"),
  'The case-sensitive assertion that broke all 2.6.68 platform builds must stay retired.');
assert(release68.toLowerCase().includes('root cause'),
  '2.6.68 release notes must continue documenting the root cause.');
assert(release69.includes('no production UI change'));
assert(release69.includes('case-sensitive'));
assert(release69.includes('Windows, Linux, and macOS'));

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.68-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, ['--check', path.join(root, 'scripts/hotfix-2.6.69-tests.js')], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.68 spacing behavior while making its documentation regression semantic instead of capitalization-sensitive.`);
