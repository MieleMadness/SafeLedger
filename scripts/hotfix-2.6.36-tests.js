'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('src/main/index.html');
const foundation = read('src/main/css/foundation.css');
const gate2635 = read('scripts/hotfix-2.6.35-tests.js');

assert.strictEqual(pkg.version, '2.6.36', 'This workflow candidate must report SafeLedger 2.6.36.');
assert(read('package.json').includes('node scripts/hotfix-2.6.36-tests.js'),
  '2.6.36 vault-search and detail-heading coverage must stay in the locked regression suite.');

assert(index.includes('placeholder="Search vaults..."'),
  'Vault search should use the shorter Search vaults wording.');
assert(!index.includes('placeholder="Search vault items..."'),
  'The redundant word items must stay removed from the Vault search field.');
assert(index.includes('title="Clear vault search"') && index.includes('aria-label="Clear vault search"'),
  'Vault search clear control should use the same simplified wording.');

for (const selector of ['#detailArea .wallet-detail-title,', '#detailArea .coin-detail-title-wrap > h1']) {
  assert(foundation.includes(selector), `Missing short underline selector: ${selector}`);
}
assert(/#detailArea \.wallet-detail-title,[\s\S]*?#detailArea \.coin-detail-title-wrap > h1\s*\{[\s\S]*?display:\s*table;[\s\S]*?width:\s*auto;[\s\S]*?border-bottom:\s*1px solid var\(--sl-border, #d7dee8\);[\s\S]*?\}/.test(foundation),
  'Vault and Asset title underlines must shrink to the title text width.');
assert(/#detailArea \.wallet-detail-header \+ hr,[\s\S]*?#detailArea \.coin-detail-header \+ hr\s*\{\s*display:\s*none\s*!important;\s*\}/.test(foundation),
  'The old full-width dividers after Vault and Asset header rows must stay hidden.');
assert(gate2635.includes('parts[2] >= 35'),
  'The 2.6.35 square compact-selection behavior must remain active on later candidates.');

console.log('PASS SafeLedger 2.6.36 simplifies Vault search wording and keeps Vault/Asset underlines exactly as wide as their title text.');
