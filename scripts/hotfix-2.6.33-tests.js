'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.33', 'This workflow candidate must report SafeLedger 2.6.33.');
assert(read('package.json').includes('node scripts/hotfix-2.6.33-tests.js'),
  '2.6.33 Windows line-ending correction must stay in the locked regression suite.');

const gate2632 = read('scripts/hotfix-2.6.32-tests.js');
const foundation = read('src/main/css/foundation.css');
const localIcons = read('src/main/css/local-icons.css');

assert(gate2632.includes("parts[2] >= 32"),
  'The complete 2.6.32 padded-rail and Activity History icon behavior must remain active on later candidates.');
assert(gate2632.includes('/\\.nav-column-collapsed\\s*\\{\\s*padding-left:'),
  'The 2.6.32 rail-padding regression must use a whitespace-tolerant check instead of an LF-only multiline literal.');
assert(!gate2632.includes("foundation.includes('.nav-column-collapsed {\\n"),
  'The Windows-breaking LF-only multiline source assertion must stay retired.');

assert(foundation.includes('--sl-compact-nav-column: 104px;'));
assert(/\.nav-column-collapsed\s*\{\s*padding-left:\s*15px\s*!important;\s*padding-right:\s*15px\s*!important;\s*\}/.test(foundation));
assert(localIcons.includes('.fa-power-off::before') && localIcons.includes('.fa-power-off::after'));
assert(localIcons.includes('.fa-unlock::before') && localIcons.includes('.fa-unlock::after'));

console.log('PASS SafeLedger 2.6.33 keeps the 2.6.32 UI behavior while making the rail-padding regression cross-platform.');
