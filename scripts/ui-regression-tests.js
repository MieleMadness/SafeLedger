'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function syntaxCheck(relative) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

function check(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}

check('main window opens at 1200 x 750', () => {
  const source = read('src/main/main.js');
  assert(source.includes('width: 1200'));
  assert(source.includes('height: 750'));
  assert(!source.includes('height: 850'));
});

check('new installations name the first profile SafeLedger', () => {
  const source = read('src/main/robust-vault.js');
  assert(source.includes("name: 'SafeLedger'"));
  assert(!source.includes("name: 'Initial Profile'"));
});

check('shared bottom detail-action dock is present', () => {
  const index = read('src/main/index.html');
  assert(index.includes('id="detailActionArea"'));
  assert(index.includes('./css/2.0.30.css'));
  assert(index.includes("require('./detail-action-enhancements.js')"));
  const css = read('src/main/css/2.0.30.css');
  assert(css.includes('.detail-action-area'));
  assert(css.includes('.emergency-lock-cell .panic-lock-inline'));
});

check('coin empty public address shows the requested light placeholder', () => {
  const record = read('src/main/record.js');
  const css = read('src/main/css/2.0.30.css');
  assert(record.includes('Use edit button to update asset.'));
  assert(record.includes("classList.add('public-address-placeholder')"));
  assert(css.includes('.public-address-placeholder'));
});

check('coin private-key display is omitted when no value exists', () => {
  const record = read('src/main/record.js');
  assert(record.includes("if(String(params.record.privateAddress||'').trim())securityUi.appendSensitiveField"));
});

check('coin and wallet dock actions are normalized to Edit Print Delete', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  assert(enhancements.includes("const ACTION_ORDER = ['edit', 'print', 'delete'];"));
  assert(enhancements.includes("value.startsWith('edit ')"));
  assert(enhancements.includes("value.startsWith('print ')"));
  assert(enhancements.includes("value.includes('delete')"));
});

check('save action is green and profiles use the bottom icon dock', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  const css = read('src/main/css/2.0.30.css');
  assert(css.includes('.detail-action-save'));
  assert(css.includes('#2e7d32'));
  assert(enhancements.includes("title: 'Save profile'"));
  assert(enhancements.includes("title: 'Edit profile'"));
  assert(enhancements.includes("title: 'Print profile'"));
  assert(enhancements.includes("title: 'Delete profile'"));
  assert(enhancements.indexOf("title: 'Edit profile'") < enhancements.indexOf("title: 'Print profile'"));
  assert(enhancements.indexOf("title: 'Print profile'") < enhancements.indexOf("title: 'Delete profile'"));
});

check('wallet and coin actions still use icon-only bottom dock', () => {
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  assert(record.includes("icon:'fa-print'"));
  assert(record.includes("icon:'fa-pencil'"));
  assert(record.includes("icon:'fa-trash'"));
  assert(record.includes("icon:'fa-save'"));
  assert(group.includes("icon:'fa-print'"));
  assert(group.includes("icon:'fa-pencil'"));
  assert(group.includes("icon:'fa-trash'"));
  assert(group.includes("icon:'fa-save'"));
  assert(!record.includes('Print coin sheet</'));
});

check('coin wallet and profile delete confirmations include a cancel action', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  assert(enhancements.includes("if (/^Confirm Delete of coin:/i.test(value)) return 'coin';"));
  assert(enhancements.includes("if (/^Confirm Delete of wallet:/i.test(value)) return 'wallet';"));
  assert(enhancements.includes("if (/^Confirm delete of profile:/i.test(value)) return 'profile';"));
  assert(enhancements.includes("value.startsWith('cancel ')"));
  assert(enhancements.includes("#recordArea a.item-selected"));
  assert(enhancements.includes("#groupArea a.item-selected"));
  assert(enhancements.includes("#vaultArea .badge-selected"));
  assert(enhancements.includes("button.innerHTML = '<i class=\"fa fa-times\" aria-hidden=\"true\"></i>';"));
  assert(enhancements.includes('Cancel delete ${kind}'));
});

check('Electron-safe Argon2 provider is bundled for crypto v3', () => {
  const pkg = JSON.parse(read('package.json'));
  const provider = read('src/main/argon2-provider.js');
  const envelope = read('src/main/key-envelope.js');
  assert.strictEqual(pkg.version, '2.0.39');
  assert.strictEqual(pkg.dependencies['hash-wasm'], '4.12.0');
  assert.strictEqual(pkg.scripts['test:electron-crypto'], 'node scripts/run-electron-crypto-smoke.js');
  assert(provider.includes("CURRENT_IMPLEMENTATION = 'hash-wasm-argon2id-v1'"));
  assert(provider.includes('wasmArgon2id'));
  assert(envelope.includes('argon2Provider.CURRENT_IMPLEMENTATION'));
});

check('Windows and Linux workflows test crypto inside Electron before packaging', () => {
  const windows = read('.github/workflows/windows-portable.yml');
  const linux = read('.github/workflows/linux-appimage.yml');
  assert(windows.includes('Run Electron crypto smoke test'));
  assert(windows.includes('npm run test:electron-crypto'));
  assert(linux.includes('Run Electron crypto smoke test'));
  assert(linux.includes('npm run test:electron-crypto'));
});

check('failed password restores Login button unless the account is locked', () => {
  const index = read('src/main/index.html');
  const guard = read('src/main/login-retry-guard.js');
  assert(index.includes("require('./login-retry-guard.js')"));
  assert(guard.includes("params.status === 'ERROR'"));
  assert(guard.includes('params.settings && params.settings.lockLogin'));
  assert(guard.includes("document.getElementById('loginBtn')"));
  assert(guard.includes('button.disabled = false'));
  assert(guard.includes("document.getElementById('masterCryptoInput')"));
});

check('wallet and coin edit forms use consistent design spacing', () => {
  const index = read('src/main/index.html');
  const spacing = read('src/main/form-spacing-enhancements.js');
  const css = read('src/main/css/2.0.35.css');
  assert(index.includes('./css/2.0.35.css'));
  assert(index.includes("require('./form-spacing-enhancements.js')"));
  assert(spacing.includes("'Modify Wallet'"));
  assert(spacing.includes("'Modify Coin'"));
  assert(spacing.includes("'Add Wallet'"));
  assert(spacing.includes("'Add Coin'"));
  assert(spacing.includes("form.classList.toggle('safeledger-edit-form'"));
  assert(css.includes('.safeledger-edit-form .form-group'));
  assert(css.includes('margin-bottom: 18px'));
  assert(css.includes('margin: 0 0 6px'));
  assert(css.includes('.safeledger-edit-form .secure-input-shell'));
  assert(css.includes('.safeledger-edit-form .sensitive-controls'));
});

check('profile search matches the wallet and coin search pattern', () => {
  const index = read('src/main/index.html');
  const search = read('src/main/search-enhancements.js');
  assert(index.includes('id="profileSearch"'));
  assert(index.includes('placeholder="Search profiles..."'));
  assert(index.includes('id="profileSearchClear"'));
  assert(search.includes("setupSearchClear('profileSearch', 'profileSearchClear')"));
  assert(search.includes('function filterProfiles()'));
  assert(search.includes("area.querySelectorAll('ul.nav > li')"));
  assert(search.includes('text.includes(query)'));
});

check('wallet and coin view/edit headers and field actions use normalized spacing', () => {
  const index = read('src/main/index.html');
  const spacing = read('src/main/detail-spacing-enhancements.js');
  const css = read('src/main/css/2.0.36.css');
  assert(index.includes('./css/2.0.36.css'));
  assert(index.includes("require('./detail-spacing-enhancements.js')"));
  assert(spacing.includes("'Modify Wallet'"));
  assert(spacing.includes("'Modify Coin'"));
  assert(spacing.includes("dockHas('edit wallet')"));
  assert(spacing.includes("dockHas('edit coin')"));
  assert(css.includes('padding-top: 12px !important'));
  assert(css.includes('#detailArea.wallet-coin-view .field-inline-actions'));
  assert(css.includes('right: 10px'));
  assert(css.includes('#detailArea.wallet-coin-view .secure-field-summary'));
  assert(css.includes('padding: 10px'));
});

check('updated UI and crypto JavaScript parses cleanly', () => {
  syntaxCheck('src/main/detail-actions.js');
  syntaxCheck('src/main/detail-action-enhancements.js');
  syntaxCheck('src/main/login-retry-guard.js');
  syntaxCheck('src/main/form-spacing-enhancements.js');
  syntaxCheck('src/main/search-enhancements.js');
  syntaxCheck('src/main/detail-spacing-enhancements.js');
  syntaxCheck('src/main/coin-form-layout-enhancements.js');
  syntaxCheck('src/main/edit-form-grid-enhancements.js');
  syntaxCheck('src/main/edit-security-enhancements.js');
  syntaxCheck('src/main/record.js');
  syntaxCheck('src/main/group.js');
  syntaxCheck('src/main/main.js');
  syntaxCheck('src/main/robust-vault.js');
  syntaxCheck('src/main/argon2-provider.js');
  syntaxCheck('src/main/key-envelope.js');
  syntaxCheck('scripts/electron-crypto-smoke.js');
  syntaxCheck('scripts/run-electron-crypto-smoke.js');
});

console.log('\n16 SafeLedger 2.0.39 UI/runtime regression checks passed.');
