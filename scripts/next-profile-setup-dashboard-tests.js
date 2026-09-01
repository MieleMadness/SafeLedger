'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const profileSetup = require(path.join(root, 'src', 'main', 'profile-setup.js'));

function testStandardAndBlankProfileModels() {
  const standard = profileSetup.standardNames();
  assert(standard.includes('Ledger'), 'Ledger should remain in the standard starter setup.');
  assert(standard.includes('MetaMask'), 'MetaMask should remain in the standard starter setup.');
  assert(standard.includes('Exodus'), 'Exodus should remain in the standard starter setup.');
  assert(!standard.includes('Keystone'), 'Previously excluded optional wallets should not become standard by accident.');
  assert(!standard.includes('Rabby Wallet'), 'Previously excluded optional wallets should not become standard by accident.');

  const blank = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', []);
  assert.deepStrictEqual(blank, [], 'Blank Profile must contain no wallets.');
}

function testSelectedWalletsLoadTheirAssets() {
  const groups = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', ['Ledger', 'Electrum']);
  assert.deepStrictEqual(groups.map((group) => group.name), ['Ledger', 'Electrum']);

  const ledger = groups.find((group) => group.name === 'Ledger');
  const electrum = groups.find((group) => group.name === 'Electrum');
  assert(ledger.records.some((record) => record.symbol === 'BTC'), 'Ledger template should preload Bitcoin.');
  assert(ledger.records.some((record) => record.symbol === 'ETH'), 'Ledger template should preload Ethereum.');
  assert.deepStrictEqual(electrum.records.map((record) => record.symbol), ['BTC'], 'Electrum should preload its Bitcoin record only.');
}

function testTemplateInputValidationHelpers() {
  assert.deepStrictEqual(profileSetup.resolveNames(['ledger', 'LEDGER', 'Electrum']), ['Ledger', 'Electrum']);
  assert.deepStrictEqual(profileSetup.unknownNames(['Ledger', 'Not A Real Wallet']), ['not a real wallet']);
}

function testProfileCreationUiAndMainProcessContract() {
  const profile = read('src/main/profile.js');
  const main = read('src/main/main.js');
  const css = read('src/main/css/profile-setup.css');
  const index = read('src/main/index.html');

  assert(profile.includes("'Standard setup'"), 'Add Profile should offer Standard setup.');
  assert(profile.includes("'Blank Profile'"), 'Add Profile should offer Blank Profile.');
  assert(profile.includes("checkbox.type = 'checkbox'"), 'Wallet templates should be selectable with checkboxes.');
  assert(profile.includes('payload.profileSetup = selectedSetup'), 'Profile setup choice should be sent separately from persisted profile metadata.');

  assert(main.includes('resolveNewProfileWalletNames(params.profileSetup)'), 'Main process should validate the requested setup.');
  assert(main.includes('initializeModernVault(idInfo.fileName, key, newProfileWalletNames)'), 'New vault should be initialized from the selected templates.');
  assert(main.includes("if (mode === 'blank') return [];"), 'Blank mode should create an empty wallet list.');

  assert(css.includes('.profile-wallet-template-grid'), 'Wallet template picker should have dedicated layout styling.');
  assert(index.includes('./css/profile-setup.css'), 'Profile setup styles should load in the application.');
}

function testRecoveryDashboardRowsOpenVaultItems() {
  const dashboard = read('src/main/dashboard-ui.js');
  const rowUi = read('src/main/dashboard-row-ui.js');

  assert(dashboard.includes("const badge = document.createElement('span');"), 'Recovery status pills should be informational spans, not links/buttons.');
  assert(!dashboard.includes('dashboard-status-action'), 'Status pills should no longer carry their own navigation action.');
  assert(dashboard.includes("document.createElement(actionable ? 'button' : 'div')"), 'The vault-item description should remain the explicit action target.');
  assert(dashboard.includes("source: 'dashboard'"), 'Dashboard navigation should identify itself as a direct vault-item action.');
  assert(dashboard.includes('profileIndex: Number(item.profileIndex)'), 'Dashboard navigation should retain an exact profile index target.');
  assert(dashboard.includes('walletIndex: Number(item.walletIndex)'), 'Dashboard navigation should retain the exact vault-item index.');
  assert(rowUi.includes("row.querySelector('.dashboard-list-main-action')"), 'The full Needs Attention row should forward to its vault-item action.');
  assert(rowUi.includes("row.setAttribute('role', 'button')"), 'Full-row navigation should remain keyboard accessible.');
}

testStandardAndBlankProfileModels();
testSelectedWalletsLoadTheirAssets();
testTemplateInputValidationHelpers();
testProfileCreationUiAndMainProcessContract();
testRecoveryDashboardRowsOpenVaultItems();
console.log('PASS branch profile setup choices and Vault Overview row navigation.');
