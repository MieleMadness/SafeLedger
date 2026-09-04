'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 32,
  'SafeLedger 2.6.32 padded-rail and Activity History icon coverage must remain active on 2.6.32 and later candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.32-tests.js'),
  '2.6.32 padded-rail and Activity History icon coverage must stay in the locked suite.');

const foundation = read('src/main/css/foundation.css');
const localIcons = read('src/main/css/local-icons.css');
const activityHistory = require('../src/main/activity-history.js');
const gate2631 = read('scripts/hotfix-2.6.31-tests.js');

assert(foundation.includes('--sl-compact-nav-column: 104px;'),
  'Collapsed Profile/Vault/Asset rails must have enough width for normal padding around artwork.');
assert(/\.nav-column-collapsed\s*\{\s*padding-left:\s*15px\s*!important;\s*padding-right:\s*15px\s*!important;\s*\}/.test(foundation),
  'Collapsed rails must keep the same 15px outer padding as expanded columns.');
assert(foundation.includes('padding-left: 9px !important;') && foundation.includes('padding-right: 9px !important;'),
  'Collapsed navigation items must keep the normal 9px horizontal item padding.');
assert(foundation.includes('.nav-column-collapsed .wallet-list-brand-image') &&
  foundation.includes('margin-right: 0 !important;'),
  'Collapsed wallet artwork must be centered without the expanded text-separation margin.');
assert(!foundation.includes('--sl-compact-nav-column: 56px;'),
  'The cramped 56px compact rail must stay retired.');

assert.strictEqual(activityHistory.describe('app-opened').icon, 'fa-power-off');
assert.strictEqual(activityHistory.describe('vault-unlocked').icon, 'fa-unlock');
assert(localIcons.includes('.fa-power-off::before') && localIcons.includes('.fa-power-off::after'),
  'SafeLedger opened must use a locally drawn power icon rather than the generic fallback bullet.');
assert(localIcons.includes('.fa-unlock::before') && localIcons.includes('.fa-unlock::after'),
  'SafeLedger unlocked must use a locally drawn open padlock.');
assert(!localIcons.includes('.fa-unlock::before { content: "▢"; }'),
  'The old square placeholder for fa-unlock must stay removed.');
assert(localIcons.includes('#loginBtn .fa-unlock::before') && localIcons.includes('#loginBtn .fa-unlock::after'),
  'The login button must retain its separate person-style local artwork.');

assert(gate2631.includes('parts[2] >= 31'),
  'The corrected 2.6.31 meta-regression must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps padded compact navigation rails and correctly rendered local Activity History open/unlock icons.`);
