'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const foundation = read('src/main/css/foundation.css');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 34,
  'SafeLedger 2.6.34 compact-rail behavior must remain active on 2.6.34 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.34-tests.js'),
  '2.6.34 compact-rail coverage must stay in the locked regression suite.');

assert(foundation.includes('--sl-compact-nav-column: 98px;'),
  'Compact rails must keep the balanced width introduced after item-padding cleanup.');
assert(!foundation.includes('--sl-compact-nav-column: 104px;'),
  'The previous wider compact rail must remain retired.');
assert(/\.nav-column-collapsed\.nav-column-main\s+\.nav\s*>\s*li\s*>\s*a\s*\{[\s\S]*?padding:\s*6px\s*!important;[\s\S]*?\}/.test(foundation),
  'Collapsed navigation items must use equal 6px padding on top, right, bottom, and left.');
assert(!foundation.includes('padding-left: 9px !important;') && !foundation.includes('padding-right: 9px !important;'),
  'Compact-item horizontal padding must no longer be wider than its vertical padding.');
assert(/\.nav-column-collapsed\s*\{\s*padding-left:\s*15px\s*!important;\s*padding-right:\s*15px\s*!important;\s*\}/.test(foundation),
  'The compact rail must keep its existing outer column breathing room.');

/* The short heading underline introduced in 2.6.34 was intentionally retired
 * in 2.6.38. Keep protecting the important part of the earlier cleanup: the
 * legacy heading-adjacent <hr> must not reappear as a full-width divider. */
assert(foundation.includes('#detailArea .page-header + hr,') && foundation.includes('#detailArea h1 + hr'),
  'Legacy heading-adjacent divider elements must remain hidden.');
assert(foundation.includes('border-bottom: 0 !important;'),
  'Current detail headings must explicitly suppress the retired underline treatment.');
assert(!foundation.includes('border-bottom: 1px solid var(--sl-border, #d7dee8);'),
  'The retired text-width heading underline must not return.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.34 balanced compact rails while honoring the later no-underline heading design.`);
