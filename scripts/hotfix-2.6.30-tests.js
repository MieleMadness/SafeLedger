'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

assert.strictEqual(pkg.version, '2.6.30', 'This workflow candidate must report SafeLedger 2.6.30.');
assert(read('package.json').includes('node scripts/hotfix-2.6.30-tests.js'),
  '2.6.30 observer-gate correction must stay in the locked regression suite.');

const gate2626 = read('scripts/hotfix-2.6.26-tests.js');
const gate2629 = read('scripts/hotfix-2.6.29-tests.js');
const collapseSource = read('src/main/column-collapse-ui.js');

assert(!gate2626.includes("assert(!collapseSource.includes('MutationObserver')"),
  'The historical compact-navigation gate must not reject harmless documentation comments containing the API name.');
assert(gate2626.includes('/\\bnew\\s+MutationObserver\\s*\\(/') &&
  gate2626.includes('/\\bMutationObserver\\s*\\(/'),
  'The historical gate must detect actual MutationObserver construction/calls instead of raw text mentions.');
assert(gate2626.includes("mainCell.addEventListener('mouseover', refreshLabels);") &&
  gate2626.includes("mainCell.addEventListener('focusin', refreshLabels);"),
  'The compact-navigation gate must protect the intended ordinary event-delegation strategy.');

assert(!/\bnew\s+MutationObserver\s*\(/.test(collapseSource) && !/\bMutationObserver\s*\(/.test(collapseSource),
  'Compact navigation must still contain no actual MutationObserver constructor/call.');
assert(collapseSource.includes("mainCell.addEventListener('mouseover', refreshLabels);") &&
  collapseSource.includes("mainCell.addEventListener('focusin', refreshLabels);"));
assert(collapseSource.includes('// MutationObserver or post-render patch loop.'),
  'A harmless explanatory comment may mention MutationObserver without causing a false regression failure.');
assert(gate2629.includes('parts[2] >= 29'),
  'The 2.6.29 compact-rail layout gate must remain active on later workflow candidates.');

console.log('PASS SafeLedger 2.6.30 distinguishes real observer code from comments while keeping event-delegated compact navigation protected.');
