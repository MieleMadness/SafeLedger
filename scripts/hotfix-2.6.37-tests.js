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
const historical = read('scripts/development-2.5.12-tests.js');
const gate2636 = read('scripts/hotfix-2.6.36-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 37,
  'SafeLedger 2.6.37 historical Vault-search correction must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.37-tests.js'),
  '2.6.37 historical Vault-search correction must stay in the locked regression suite.');

assert(historical.includes("index.includes('id=\"groupSearch\"')"),
  'The historical 2.5.12 gate must still protect the existence of Vault search.');
assert(historical.includes("placeholder=\"Search vaults\""),
  'The historical gate must accept the current concise Vault search wording without ellipsis.');
assert(!historical.includes("assert(index.includes('placeholder=\"Search vault items...\"'))"),
  'The old exact verbose placeholder assertion must stay retired.');
assert(index.includes('placeholder="Search vaults"'));
assert(!index.includes('placeholder="Search vault items'));
assert(!index.includes('placeholder="Search vaults..."'));

assert(foundation.includes('#detailArea h1,') && foundation.includes('#detailArea h6,'),
  'The current no-underline heading policy must cover the complete display hierarchy.');
assert(foundation.includes('border-bottom: 0 !important;'),
  'Display headings must remain free of the retired underline styling.');
assert(gate2636.includes('parts[2] >= 36'),
  'The 2.6.36 Vault search/structural cleanup gate must remain active on later candidates.');

console.log(`PASS SafeLedger ${pkg.version} keeps the historical Vault search correction compatible with punctuation-free search text and no-underlined display headings.`);
