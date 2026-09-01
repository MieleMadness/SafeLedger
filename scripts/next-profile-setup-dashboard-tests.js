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

function testRecoveryDashboardPillsAreWalletActions() {
  const dashboard = read('src/main/dashboard-ui.js');
  const css = read('src/main/css/profile-setup.css');

  assert(dashboard.includes("document.createElement(actionable ? 'button' : 'span')"), 'Actionable recovery status should render as a button.');
  assert(dashboard.includes("' dashboard-status-action'"), 'Actionable recovery pills should have an explicit action class.');
  assert(dashboard.includes('onActivate: () => openWallet(item)'), 'Recovery status pill should open its wallet.');
  assert(dashboard.includes("document.createElement(actionable ? 'button' : 'div')"), 'Wallet description should be a separate sibling button.');
  assert(dashboard.includes("profileFile: String(item.profileFile || '')"), 'Wallet navigation should retain exact profile file targeting.');
  assert(dashboard.includes('walletIndex: Number(item.walletIndex)'), 'Wallet navigation should retain exact wallet index targeting.');
  assert(css.includes('.dashboard-status-action'), 'Clickable status pills should have interaction styling.');
}

testStandardAndBlankProfileModels();
testSelectedWalletsLoadTheirAssets();
testTemplateInputValidationHelpers();
testProfileCreationUiAndMainProcessContract();
testRecoveryDashboardPillsAreWalletActions();
console.log('PASS branch profile setup choices and Recovery Dashboard wallet actions.');
