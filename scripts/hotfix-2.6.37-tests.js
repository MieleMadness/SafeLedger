'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('src/main/index.html');
const foundation = read('src/main/css/foundation.css');
const historical = read('scripts/development-2.5.12-tests.js');
const gate2636 = read('scripts/hotfix-2.6.36-tests.js');

assert.strictEqual(pkg.version, '2.6.37', 'This workflow candidate must report SafeLedger 2.6.37.');
assert(read('package.json').includes('node scripts/hotfix-2.6.37-tests.js'),
  '2.6.37 historical vault-search correction must stay in the locked regression suite.');

assert(historical.includes("index.includes('id=\"groupSearch\"')"),
  'The historical 2.5.12 gate must still protect the existence of Vault search.');
assert(historical.includes("placeholder=\"Search vaults...\""),
  'The historical gate must accept the current concise Vault search wording.');
assert(!historical.includes("assert(index.includes('placeholder=\"Search vault items...\"'))"),
  'The old exact placeholder assertion must stay retired.');
assert(index.includes('placeholder="Search vaults..."'));
assert(!index.includes('placeholder="Search vault items..."'));

assert(foundation.includes('#detailArea .wallet-detail-title,') &&
  foundation.includes('#detailArea .coin-detail-title-wrap > h1'),
  'The requested Vault/Asset title-width underline selectors must remain unchanged from 2.6.36.');
assert(gate2636.includes('parts[2] >= 36'),
  'The complete 2.6.36 Vault search and underline behavior must remain active on later candidates.');

console.log('PASS SafeLedger 2.6.37 keeps the 2.6.36 UI behavior while modernizing the stale 2.5.12 Vault search wording gate.');
