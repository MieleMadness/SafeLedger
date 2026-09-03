'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 14,
  'SafeLedger 2.6.14 stylesheet consolidation regressions must remain active on 2.6.14 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.14-tests.js'),
  '2.6.14 stylesheet consolidation coverage must stay in the locked suite.');

const index = read('src/main/index.html');
const currentUi = read('src/main/css/ui-current.css');
const baseline = JSON.parse(read('scripts/ui-visual-baseline.json'));
const retiredHistoricalLayers = [
  'src/main/css/ui-2.5.8.css',
  'src/main/css/ui-2.5.9.css',
  'src/main/css/ui-2.5.11.css',
  'src/main/css/ui-2.5.12.css',
  'src/main/css/ui-2.5.13.css',
  'src/main/css/ui-2.5.14.css',
  'src/main/css/ui-2.5.15.css',
  'src/main/css/ui-2.5.16.css',
  'src/main/css/ui-2.6.7-scale.css',
  'src/main/css/ui-2.6.7-theme-refinement.css'
];

function canonicalGitBlobSha(content) {
  const canonical = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const body = Buffer.from(canonical, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

assert(index.includes('<link href="./css/ui-current.css" rel="stylesheet">'),
  'SafeLedger must load one current UI cascade.');
assert.strictEqual((index.match(/\.\/css\/ui-current\.css/g) || []).length, 1,
  'Current UI stylesheet should be loaded exactly once.');
for (const file of retiredHistoricalLayers) {
  const href = `./css/${path.basename(file)}`;
  assert(!index.includes(href), `${href} must not be loaded separately at runtime.`);
  assert.strictEqual(fs.existsSync(path.join(root, file)), false,
    `${file} should stay deleted after its rules were consolidated into ui-current.css.`);
}

assert.strictEqual(canonicalGitBlobSha(currentUi), baseline.uiCurrentGitBlobSha,
  'The 2.6.14 consolidated UI must remain identical to its approved fixture-independent visual baseline.');

const currentIndex = index.indexOf('./css/ui-current.css');
assert(currentIndex > index.indexOf('./css/profile-setup.css'),
  'The consolidated UI cascade must remain after Profile setup styling, matching the former patch-layer position.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.14 single current UI stylesheet through its approved visual baseline with retired fixtures removed.`);
