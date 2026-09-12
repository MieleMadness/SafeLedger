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
assert(parts[2] >= 77, 'The 2.6.76 regression-gate repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.77-tests.js'),
  'The 2.6.77 regression repair must remain in the main regression chain.');

const gate76 = read('scripts/hotfix-2.6.76-tests.js');
assert(!gate76.includes('The historical gate must not positively require the retired gradient logo.'),
  'The brittle source-text polarity assertion from 2.6.76 must stay removed.');
assert(gate76.includes("execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.4-tests.js')], { stdio: 'pipe' });"),
  'The historical Chain Games regression must be validated by executing it.');
assert(gate76.includes('Do not infer assertion') && gate76.includes('polarity by substring-searching'),
  'The repaired gate should document why source-text polarity checks are unsafe.');

const release = read('RELEASE-2.6.77.md');
for (const phrase of [
  'all three 2.6.76 platform workflows',
  'false positive',
  'substring',
  'behavior-based',
  'no production application or logo code changes',
  'local/offline'
]) {
  assert(release.toLowerCase().includes(phrase.toLowerCase()), `2.6.77 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.76-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.76-tests.js',
  'scripts/hotfix-2.6.77-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} validates the Chain Games regression behavior instead of guessing assertion polarity from source text.`);
