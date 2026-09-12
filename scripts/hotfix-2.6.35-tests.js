'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const foundation = read('src/main/css/foundation.css');
const gate2634 = read('scripts/hotfix-2.6.34-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 35,
  'SafeLedger 2.6.35 square compact-selection coverage must remain active on 2.6.35 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.35-tests.js'),
  '2.6.35 square compact-selection coverage must stay in the locked regression suite.');

assert(foundation.includes('--sl-compact-nav-column: 98px;'),
  'The approved 98px compact rail width must remain unchanged.');
assert(/\.nav-column-collapsed\.nav-column-main\s+\.nav\s*>\s*li\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?\}/.test(foundation),
  'Collapsed list rows must center their shrink-wrapped selection tile.');
assert(/\.nav-column-collapsed\.nav-column-main\s+\.nav\s*>\s*li\s*>\s*a\s*\{[\s\S]*?display:\s*inline-flex\s*!important;[\s\S]*?width:\s*fit-content\s*!important;[\s\S]*?padding:\s*6px\s*!important;[\s\S]*?\}/.test(foundation),
  'Collapsed links must shrink-wrap their square icon with equal 6px padding instead of stretching across the rail.');
assert(/\.nav-column-collapsed\s+\.profile-list-row,[\s\S]*?\.nav-column-collapsed\s+\.coin-list-row\s*\{[\s\S]*?width:\s*auto\s*!important;[\s\S]*?\}/.test(foundation),
  'Profile and Asset row wrappers must not force the compact selection tile wider than its icon.');
assert(foundation.includes('a:has(.badge-selected)') && foundation.includes('border-color: rgba(255, 255, 255, .95) !important;'),
  'Collapsed Profile selection must move to the same square link outline used by other compact navigation items.');
assert(/\.nav-column-collapsed\s+\.badge-selected\s*\{[\s\S]*?border-color:\s*transparent\s*!important;[\s\S]*?\}/.test(foundation),
  'The old circular Profile selection border must be suppressed in compact mode to avoid a double outline.');
assert(gate2634.includes('parts[2] >= 34'),
  'The complete 2.6.34 balanced padding and short-heading behavior must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps square compact navigation selection tiles with no extra side width.`);
