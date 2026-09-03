'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2515 = version[0] > 2 ||
  (version[0] === 2 && version[1] > 5) ||
  (version[0] === 2 && version[1] === 5 && version[2] >= 15);
assert(atLeast2515, 'build must be SafeLedger 2.5.15 or later');

const css = read('src/main/css/ui-2.5.15.css');
assert(css.includes('#loginBtn'), 'login button must receive the shared SafeLedger button treatment');
assert(css.includes('.btn:not(:disabled):hover'), 'shared button hover styling must cover standard buttons');
assert(css.includes('outline: 2px solid var(--sl-primary) !important;'), 'button highlight must use the 2px SafeLedger focus frame');
assert(css.includes('outline-offset: -2px !important;'), 'button highlight must stay inside the button footprint');
assert(css.includes('box-shadow: var(--sl-shadow-soft) !important;'), 'visual buttons must use the restrained Emergency Lock shadow');
assert(!css.includes('0 0 0 3px'), '2.5.15 must not reintroduce the old outer glow');

const index = read('src/main/index.html');
assert(index.includes('./css/ui-2.5.15.css'), '2.5.15 UI layer must load after prior refinements');

const rendererEntry = read('src/main/renderer-entry.js');
assert(!rendererEntry.includes("require('./vault-language-ui.js')"),
  'Vault Item terminology must be rendered directly instead of restored by the retired language observer.');
assert(rendererEntry.includes("require('./recovery-intelligence-vault-overview-ui.js')"), 'Vault Overview must restore optional Recovery Intelligence');

const dashboardUi = require(path.join(root, 'src', 'main', 'dashboard-ui.js'))._test;
const label = dashboardUi.vaultContentsLabel({
  hardwareWallets: 2,
  softwareWallets: 3,
  otherWallets: 1,
  wallets: 6,
  exchanges: 2,
  services: 1
});
assert(label.startsWith('Vault contents:'), 'inventory summary must be labeled Vault contents');
assert(label.includes('2 hardware wallets'), 'Vault contents must retain useful hardware-wallet detail');
assert(label.includes('3 software wallets'), 'Vault contents must retain useful software-wallet detail');
assert(label.includes('2 exchange accounts'), 'Vault contents must include exchange accounts');
assert(label.includes('1 Web / Web3 service'), 'Vault contents must include Web / Web3 services');
assert.strictEqual(
  dashboardUi.vaultContentsLabel({}),
  'Add a wallet, exchange account, or Web / Web3 service to begin building your vault inventory.',
  'empty Vault Overview should explain all supported vault-item families'
);

const groupSource = read('src/main/group.js');
for (const phrase of [
  'Vault Items appear after a Profile is selected.',
  'No vault items yet',
  'Add a Vault Item to build this Profile recovery plan.'
]) {
  assert(groupSource.includes(phrase), `missing direct Vault Item terminology contract: ${phrase}`);
}

const globalSearchSource = read('src/main/global-search-ui.js');
assert(globalSearchSource.includes('Search Profiles, Vault Items, and Assets without indexing secret values.'),
  'Global Search introduction must use Vault Item terminology directly.');
assert(globalSearchSource.includes("return type === 'wallet' ? 'VAULT ITEM'"),
  'Global Search must display internal wallet results as Vault Items directly.');

const dashboardSource = read('src/main/dashboard-ui.js');
assert(dashboardSource.includes('Click a vault item below to open it and resolve the recovery gaps.'),
  'Vault Overview recovery actions must use Vault Item terminology directly.');
assert(dashboardSource.includes("makeStat('Vault Items', vaultItems)"),
  'Vault Overview inventory must create the Vault Items stat directly.');

const intelligence = read('src/main/recovery-intelligence-vault-overview-ui.js');
assert(intelligence.includes("!== 'Vault Overview'"), 'Recovery Intelligence companion must recognize the renamed Vault Overview');

console.log('PASS SafeLedger 2.5.15+ shared button aesthetics and directly rendered Vault Item terminology/overview coverage.');
