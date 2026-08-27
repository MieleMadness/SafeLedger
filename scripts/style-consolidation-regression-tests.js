'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const index = read('src/main/index.html');
const css = read('src/main/css/site.css');

const legacyPatchFiles = [
  'src/main/css/2.0.4.css',
  'src/main/css/2.0.30.css',
  'src/main/css/2.0.35.css',
  'src/main/css/2.0.36.css',
  'src/main/css/2.0.38.css',
  'src/main/css/2.0.39.css',
  'src/main/css/2.0.41.css',
  'src/main/css/2.0.44.css'
];

assert(index.includes('./css/site.css'));
assert(index.includes('./css/token-icons.css'));
assert(!index.includes('./css/2.0.'));

for (const relative of legacyPatchFiles) {
  assert.strictEqual(exists(relative), false, `${relative} should remain removed`);
}

for (const selector of [
  '.settings-section',
  '.detail-action-area',
  '.safeledger-edit-form',
  '#detailArea .edit-info-grid',
  '.edit-sensitive-shell',
  '#vaultArea .badge-circle.badge-selected',
  '.safeledger-lockout-panel'
]) {
  assert(css.includes(selector), `Consolidated site.css should contain ${selector}`);
}

console.log('PASS canonical stylesheet consolidation and legacy CSS patch cleanup.');
