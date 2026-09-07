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
  assert(standard.includes('Chain Games'), 'The reviewed Chain Games Web3 starter should be preselected in standard setup.');
  assert(!standard.includes('Keystone'), 'Previously excluded optional wallets should not become standard by accident.');
  assert(!standard.includes('Rabby Wallet'), 'Previously excluded optional wallets should not become standard by accident.');

  const blank = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', []);
  assert.deepStrictEqual(blank, [], 'Blank Profile must contain no vault items.');
}

function testSelectedWalletsLoadTheirAssets() {
  /* Electrum remains in the underlying reviewed wallet catalog but currently
   * has no local brand logo, so 2.5.16 intentionally omits it from New Profile
   * templates and rejects it as a template-selection value. */
  const groups = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', ['Ledger', 'Electrum']);
  assert.deepStrictEqual(groups.map((group) => group.name), ['Ledger']);

  const ledger = groups.find((group) => group.name === 'Ledger');
  assert(ledger.records.some((record) => record.symbol === 'BTC'), 'Ledger template should preload Bitcoin.');
  assert(ledger.records.some((record) => record.symbol === 'ETH'), 'Ledger template should preload Ethereum.');
  assert(!groups.some((group) => group.name === 'Electrum'), 'Logo-less wallets must not be created through New Profile templates.');

  const chainGames = profileSetup.buildGroups('2026-09-01T00:00:00.000Z', ['Chain Games'])[0];
  assert(chainGames && chainGames.category === 'Web3 Account', 'Chain Games starter must remain a Web3 Account, not a generic wallet.');
  assert(chainGames.records.length > 0 && chainGames.records.every((record) => record.symbol === 'CHAIN'),
    'Chain Games starter should preload its reviewed CHAIN network entries.');
}

function testTemplateInputValidationHelpers() {
  assert.deepStrictEqual(profileSetup.resolveNames(['ledger', 'LEDGER', 'Electrum']), ['Ledger']);
  assert.deepStrictEqual(profileSetup.unknownNames(['Ledger', 'Electrum', 'Not A Real Wallet']), ['electrum', 'not a real wallet']);

  const templates = profileSetup.availableTemplates();
  const walletTemplates = templates.filter((template) => template.service !== true);
  const serviceTemplates = templates.filter((template) => template.service === true);
  assert(walletTemplates.every((template) => template.hasIcon === true),
    'Conventional New Profile wallet templates must still have local Web3Icons artwork.');
  assert(serviceTemplates.every((template) => template.standard === true && template.category === 'Web3 Account'),
    'Any New Profile service template must be a deliberate reviewed standard Web3 starter.');
  assert(serviceTemplates.some((template) => template.name === 'Chain Games'),
    'Chain Games must be exposed through the deliberate reviewed service-template path.');
}

function testProfileCreationUiAndMainProcessContract() {
  const profile = read('src/main/profile.js');
  const main = read('src/main/main.js');
  const transaction = read('src/main/profile-transaction.js');
  const css = read('src/main/css/profile-setup.css');
  const index = read('src/main/index.html');

  assert(profile.includes("'Standard setup'"), 'Add Profile should offer Standard setup.');
  assert(profile.includes("'Blank Profile'"), 'Add Profile should offer Blank Profile.');
  assert(profile.includes("checkbox.type = 'checkbox'"), 'Starter templates should be selectable with checkboxes.');
  assert(profile.includes('payload.profileSetup = selectedSetup'), 'Profile setup choice should be sent separately from persisted profile metadata.');

  assert(main.includes('resolveNewProfileWalletNames(params.profileSetup)'), 'Main process should validate the requested setup.');
  assert(main.includes('walletNames: newProfileWalletNames'), 'Validated selected templates must be passed into the transactional profile creator.');
  assert(main.includes('initializeProfile: initializeModernVault'), 'Transactional profile creation must still use the modern template-aware vault initializer.');
  assert(transaction.includes('profileData = await initializeProfile(profileFile, cryptoKey, walletNames);'),
    'The transaction must initialize the new encrypted profile from the selected templates before publishing it.');
  assert(main.includes("if (mode === 'blank') return [];"), 'Blank mode should create an empty vault-item list.');

  assert(css.includes('.profile-wallet-template-grid'), 'Starter template picker should have dedicated layout styling.');
  assert(index.includes('./css/profile-setup.css'), 'Profile setup styles should load in the application.');
}

function testRecoveryDashboardRowsOpenVaultItems() {
  const dashboard = read('src/main/dashboard-ui.js');

  assert(dashboard.includes("const badge = document.createElement('span');"), 'Recovery status pills should be informational spans, not links/buttons.');
  assert(!dashboard.includes('dashboard-status-action'), 'Status pills should no longer carry their own navigation action.');
  assert(dashboard.includes("row.className = `dashboard-list-row${actionable ? ' dashboard-list-row-action' : ''}`;"),
    'Actionable vault-item rows should be created directly by the canonical dashboard renderer.');
  assert(dashboard.includes("main.className = `dashboard-list-main${actionable ? ' dashboard-list-main-action' : ''}`;"),
    'The vault-item description should retain its explicit action styling.');
  assert(dashboard.includes("source: 'dashboard'"), 'Dashboard navigation should identify itself as a direct vault-item action.');
  assert(dashboard.includes('profileIndex: Number(item.profileIndex)'), 'Dashboard navigation should retain an exact profile index target.');
  assert(dashboard.includes('walletIndex: Number(item.walletIndex)'), 'Dashboard navigation should retain the exact vault-item index.');
  assert(dashboard.includes("row.addEventListener('click', () => openWallet(item));"),
    'The full Needs Attention row should directly open its exact vault item.');
  assert(dashboard.includes("row.setAttribute('role', 'button');"), 'Full-row navigation should remain keyboard accessible.');
  assert(dashboard.includes("event.key !== 'Enter' && event.key !== ' '"), 'Keyboard activation must remain available for actionable rows.');
  assert.strictEqual(fs.existsSync(path.join(root, 'src/main/dashboard-row-ui.js')), false,
    'The retired post-render dashboard row forwarding helper must not return.');
  assert(!dashboard.includes('MutationObserver') && !dashboard.includes('.click()'),
    'Dashboard navigation should remain directly state-driven instead of repaired after rendering.');
}

testStandardAndBlankProfileModels();
testSelectedWalletsLoadTheirAssets();
testTemplateInputValidationHelpers();
testProfileCreationUiAndMainProcessContract();
testRecoveryDashboardRowsOpenVaultItems();
console.log('PASS profile setup choices, local-artwork template filtering, transactional template-aware profile creation, reviewed Chain Games starter, and directly rendered Vault Overview row navigation.');
