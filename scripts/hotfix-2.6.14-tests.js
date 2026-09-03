'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.14', 'This workflow candidate must report SafeLedger 2.6.14.');
assert(read('package.json').includes('node scripts/hotfix-2.6.14-tests.js'),
  '2.6.14 stylesheet consolidation coverage must stay in the locked suite.');

const index = read('src/main/index.html');
const currentUi = read('src/main/css/ui-current.css');
const historicalLayers = [
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

assert(index.includes('<link href="./css/ui-current.css" rel="stylesheet">'),
  'SafeLedger must load one current UI cascade.');
assert.strictEqual((index.match(/\.\/css\/ui-current\.css/g) || []).length, 1,
  'Current UI stylesheet should be loaded exactly once.');
for (const file of historicalLayers) {
  const href = `./css/${path.basename(file)}`;
  assert(!index.includes(href), `${href} must not be loaded separately at runtime.`);
  assert(fs.existsSync(path.join(root, file)), `${file} should remain as a temporary equivalence fixture in 2.6.14.`);
}

function normalizedCss(value) {
  return String(value || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, '');
}

const historicalCascade = historicalLayers.map(read).join('\n');
assert.strictEqual(
  normalizedCss(currentUi),
  normalizedCss(historicalCascade),
  'ui-current.css must preserve the exact rule order and declarations from the historical runtime cascade.'
);

const currentIndex = index.indexOf('./css/ui-current.css');
assert(currentIndex > index.indexOf('./css/profile-setup.css'),
  'The consolidated UI cascade must remain after Profile setup styling, matching the former patch-layer position.');

console.log('PASS SafeLedger 2.6.14 loads one current UI stylesheet with an exactly equivalent historical cascade.');