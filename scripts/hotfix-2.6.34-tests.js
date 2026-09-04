'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const foundation = read('src/main/css/foundation.css');

assert.strictEqual(pkg.version, '2.6.34', 'This workflow candidate must report SafeLedger 2.6.34.');
assert(read('package.json').includes('node scripts/hotfix-2.6.34-tests.js'),
  '2.6.34 rail/heading coverage must stay in the locked regression suite.');

assert(foundation.includes('--sl-compact-nav-column: 98px;'),
  'Compact rails must be resized after balancing item padding.');
assert(!foundation.includes('--sl-compact-nav-column: 104px;'),
  'The previous wider compact rail must be retired after the horizontal padding reduction.');
assert(/\.nav-column-collapsed\.nav-column-main\s+\.nav\s*>\s*li\s*>\s*a\s*\{[\s\S]*?padding:\s*6px\s*!important;[\s\S]*?\}/.test(foundation),
  'Collapsed navigation items must use equal 6px padding on top, right, bottom, and left.');
assert(!foundation.includes('padding-left: 9px !important;') && !foundation.includes('padding-right: 9px !important;'),
  'Compact-item horizontal padding must no longer be wider than its vertical padding.');
assert(/\.nav-column-collapsed\s*\{\s*padding-left:\s*15px\s*!important;\s*padding-right:\s*15px\s*!important;\s*\}/.test(foundation),
  'The compact rail must keep its existing outer column breathing room.');

assert(foundation.includes('#detailArea .page-header,') && foundation.includes('#detailArea h1:has(+ hr)'),
  'Legacy detail headings must own their short underline instead of relying on a full-width divider.');
assert(foundation.includes('border-bottom: 1px solid var(--sl-border, #d7dee8);'),
  'Heading underline must follow the current theme border color.');
assert(foundation.includes('#detailArea .page-header + hr,') && foundation.includes('#detailArea h1 + hr'),
  'Full-width divider elements immediately under headings must be retired visually.');
assert(/#detailArea \.page-header \+ hr,[\s\S]*?#detailArea h1 \+ hr\s*\{\s*display:\s*none\s*!important;\s*\}/.test(foundation),
  'Heading-adjacent full-width divider lines must be hidden while standalone separators remain available.');

console.log('PASS SafeLedger 2.6.34 balances compact item padding, resizes rails proportionally, and keeps heading underlines text-width only.');
