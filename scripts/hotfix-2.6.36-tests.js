'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const index = read('src/main/index.html');
const foundation = read('src/main/css/foundation.css');
const gate2635 = read('scripts/hotfix-2.6.35-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 36,
  'SafeLedger 2.6.36 Vault-search and detail-heading coverage must remain active on 2.6.36 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.36-tests.js'),
  '2.6.36 Vault-search and detail-heading coverage must stay in the locked regression suite.');

assert(index.includes('id="groupSearch"'), 'Vault search control must remain present.');
assert(index.includes('placeholder="Search vaults"'),
  'Vault search should keep the concise Search vaults wording without trailing punctuation.');
assert(!index.includes('placeholder="Search vault items'),
  'The redundant word items must stay removed from the Vault search field.');
assert(index.includes('title="Clear vault search"') && index.includes('aria-label="Clear vault search"'),
  'Vault search clear control should use the same simplified wording.');

/* 2.6.38 intentionally removed heading underlines everywhere. Preserve the
 * 2.6.36 structural cleanup by requiring the legacy full-width dividers after
 * Vault/Asset icon headers to stay hidden. */
assert(/#detailArea \.wallet-detail-header \+ hr,[\s\S]*?#detailArea \.coin-detail-header \+ hr[\s\S]*?\{[\s\S]*?display:\s*none\s*!important;[\s\S]*?\}/.test(foundation),
  'Legacy full-width dividers after Vault and Asset header rows must stay hidden.');
assert(foundation.includes('#detailArea h1,') && foundation.includes('#detailArea h6,'),
  'Current detail heading policy must cover the complete H1-H6 hierarchy.');
assert(foundation.includes('border-bottom: 0 !important;'),
  'Current detail headings must remain free of the retired underline treatment.');
assert(gate2635.includes('parts[2] >= 35'),
  'The 2.6.35 square compact-selection behavior must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps concise Vault search wording, hidden legacy header dividers, and the current no-underline heading design.`);
