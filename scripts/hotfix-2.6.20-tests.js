'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.20', 'This workflow candidate must report SafeLedger 2.6.20.');
assert(read('package.json').includes('node scripts/hotfix-2.6.20-tests.js'),
  '2.6.20 sizing-gate modernization coverage must stay in the locked suite.');

const uiGate = read('scripts/ui-regression-tests.js');
const windowSizingSource = read('src/main/window-sizing-main.js');
const foundation = read('src/main/css/foundation.css');

assert(!uiGate.includes("windowSizing.includes('const PREFERRED_WIDTH = 1400;')"),
  'General UI regression must not freeze the retired 1400px preferred width.');
assert(uiGate.includes("const sizingPolicy = require('../src/main/window-sizing-main.js');"),
  'General UI regression should validate the actual main-process sizing policy.');
assert(uiGate.includes('sizingPolicy.PREFERRED_WIDTH >= 1200'),
  'General UI regression should retain a desktop-width safety floor without overriding intentional layout tuning.');
assert(windowSizingSource.includes('const PREFERRED_WIDTH = 1283;'));
assert(foundation.includes('grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) minmax(0, 2fr) minmax(0, 5fr)'));

const layoutGate = read('scripts/hotfix-2.6.19-tests.js');
assert(layoutGate.includes('windowSizing.PREFERRED_WIDTH, 1283'),
  'The dedicated 2.6.19 regression must remain the exact owner of the 1283px layout decision.');
assert(layoutGate.includes("status: 'DELETED', statusMsg: 'Item Deleted'"),
  'The dedicated 2.6.19 regression must keep red deletion feedback protected.');

console.log('PASS SafeLedger 2.6.20 modernizes the general UI sizing gate while preserving the exact 2.6.19 layout and deletion behavior.');
