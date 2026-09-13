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
assert(parts[2] >= 86, 'The punctuation-tolerant focused-column documentation gate must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.86-tests.js'),
  'The 2.6.86 regression gate must remain in the main regression chain.');

const historical = read('scripts/hotfix-2.6.84-tests.js');
assert(historical.includes("const normalizeDoc = (value)"),
  'The 2.6.84 release-note gate must normalize punctuation before semantic phrase checks.');
assert(historical.includes(".replace(/[^a-z0-9]+/g, ' ')"),
  'Documentation checks must treat punctuation such as main-focus and local/offline as separators.');
assert(!historical.includes("const release = read('RELEASE-2.6.84.md').toLowerCase();"),
  'The brittle punctuation-sensitive release-note check must not return.');

const release84 = read('RELEASE-2.6.84.md').toLowerCase();
assert(release84.includes('main-focus'), 'The original 2.6.84 wording should remain valid without being rewritten just to satisfy a test.');
assert(release84.includes('local/offline'), 'The original local/offline wording should remain valid without test-driven copy edits.');

const release86 = read('RELEASE-2.6.86.md').toLowerCase();
for (const phrase of ['root cause', 'punctuation', 'main-focus', 'local/offline', 'no production ui changes']) {
  assert(release86.includes(phrase), `2.6.86 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.84-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.85-tests.js')], { stdio: 'pipe' });
for (const relative of ['scripts/hotfix-2.6.84-tests.js', 'scripts/hotfix-2.6.85-tests.js', 'scripts/hotfix-2.6.86-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log(`PASS SafeLedger ${pkg.version} keeps the focused-column release-note regression semantic across punctuation changes.`);
