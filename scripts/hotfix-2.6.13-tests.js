'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 13,
  'SafeLedger 2.6.13 regressions must remain active on 2.6.13 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.13-tests.js'),
  '2.6.13 regression coverage must stay in the locked suite.');

const legacyGate = read('scripts/development-2.5.8-tests.js');
const profileSource = read('src/main/profile.js');
const entrySource = read('src/main/renderer-entry.js');

assert(!legacyGate.includes("read('src/main/profile-wallet-picker-ui.js')"),
  'Historical wallet-picker coverage must test the canonical Profile renderer, not the retired helper.');
assert(legacyGate.includes("const profile = read('src/main/profile.js');"));
assert(legacyGate.includes("walletIcons.createIconElement({ name: template.name }, 'profile-wallet-template-icon')"));
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/profile-wallet-picker-ui.js')), false,
  'The retired Profile wallet-picker observer helper must stay removed.');
assert(!entrySource.includes('profile-wallet-picker-ui.js'));
assert(profileSource.includes('function createWalletTemplateIcon(template)'));
assert(!profileSource.includes('MutationObserver'));

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.13 historical wallet-picker gate on the direct Profile renderer.`);