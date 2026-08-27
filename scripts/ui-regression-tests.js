'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const syntaxCheck = (relative) => execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }

check('main window and first profile defaults remain correct', () => {
  const main = read('src/main/main.js');
  const vault = read('src/main/robust-vault.js');
  assert(main.includes('width: 1200'));
  assert(main.includes('height: 750'));
  assert(vault.includes("name: 'SafeLedger'"));
  assert(!vault.includes("name: 'Initial Profile'"));
});

check('shared bottom action dock and emergency control remain wired', () => {
  const index = read('src/main/index.html');
  const css = read('src/main/css/2.0.30.css');
  assert(index.includes('id="detailActionArea"'));
  assert(index.includes("require('./detail-action-enhancements.js')"));
  assert(css.includes('.detail-action-area'));
  assert(css.includes('.emergency-lock-cell .panic-lock-inline'));
});

check('coin placeholders, private-key omission, and icon actions remain wired', () => {
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  assert(record.includes('Use edit button to update asset.'));
  assert(record.includes("if(String(params.record.privateAddress||'').trim())securityUi.appendSensitiveField"));
  for (const token of ["icon:'fa-print'", "icon:'fa-pencil'", "icon:'fa-trash'", "icon:'fa-save'"]) {
    assert(record.includes(token));
    assert(group.includes(token));
  }
});

check('detail action order, delete cancel, and profile dock remain normalized', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  assert(enhancements.includes("const ACTION_ORDER = ['edit', 'print', 'delete'];"));
  assert(enhancements.includes("if (/^Confirm Delete of coin:/i.test(value)) return 'coin';"));
  assert(enhancements.includes("if (/^Confirm Delete of wallet:/i.test(value)) return 'wallet';"));
  assert(enhancements.includes("if (/^Confirm delete of profile:/i.test(value)) return 'profile';"));
  assert(enhancements.includes("title: 'Save profile'"));
  assert(enhancements.includes("title: 'Edit profile'"));
  assert(enhancements.includes("title: 'Print profile'"));
  assert(enhancements.includes("title: 'Delete profile'"));
});

check('Argon2id v3 direct initialization is the only active startup crypto path', () => {
  const pkg = JSON.parse(read('package.json'));
  const provider = read('src/main/argon2-provider.js');
  const envelope = read('src/main/key-envelope.js');
  const session = read('src/main/crypto-session-main.js');
  const bridge = read('src/main/crypto-ui-bridge.js');
  assert.strictEqual(pkg.version, '2.0.48');
  assert.strictEqual(pkg.dependencies['hash-wasm'], '4.12.0');
  assert(provider.includes("CURRENT_IMPLEMENTATION = 'hash-wasm-argon2id-v1'"));
  assert(session.includes("ipcMain.handle('crypto-v3-initialize'"));
  assert(bridge.includes("ipc.invoke('crypto-v3-initialize', password)"));
  assert(!session.includes('crypto-v3-migrate-legacy'));
  assert(!bridge.includes('crypto-v3-migrate-legacy'));
  assert(!envelope.includes('deriveLegacyKey'));
});

check('Windows artifact remains flat with generated PDF README', () => {
  const windows = read('.github/workflows/windows-portable.yml');
  const linux = read('.github/workflows/linux-appimage.yml');
  const pdf = read('scripts/readme-to-pdf.js');
  assert(windows.includes("Get-ChildItem -Path dist -Filter 'SafeLedger-*-Portable.exe'"));
  assert(windows.includes('Copy-Item $exe.FullName -Destination release/windows/'));
  assert(windows.includes('npm run docs:pdf -- release/windows/README.pdf'));
  assert(windows.includes('path: release/windows/*'));
  assert(pdf.includes('printToPDF'));
  assert(linux.includes('npm run test:electron-crypto'));
});

check('login retry and lockout protections remain wired', () => {
  const index = read('src/main/index.html');
  const guard = read('src/main/login-retry-guard.js');
  assert(index.includes("require('./login-retry-guard.js')"));
  assert(guard.includes('params.settings && params.settings.lockLogin'));
  assert(guard.includes('button.disabled = false'));
});

check('wallet and coin forms retain spacing, grid, and detail normalization', () => {
  const index = read('src/main/index.html');
  const formSpacing = read('src/main/form-spacing-enhancements.js');
  const detailSpacing = read('src/main/detail-spacing-enhancements.js');
  const css35 = read('src/main/css/2.0.35.css');
  const css36 = read('src/main/css/2.0.36.css');
  assert(index.includes("require('./form-spacing-enhancements.js')"));
  assert(index.includes("require('./edit-form-grid-enhancements.js')"));
  assert(formSpacing.includes("'Modify Wallet'"));
  assert(formSpacing.includes("'Modify Coin'"));
  assert(css35.includes('margin-bottom: 18px'));
  assert(detailSpacing.includes("dockHas('edit wallet')"));
  assert(detailSpacing.includes("dockHas('edit coin')"));
  assert(css36.includes('padding-top: 12px !important'));
});

check('profile search and selected-row styling remain wired', () => {
  const index = read('src/main/index.html');
  const search = read('src/main/search-enhancements.js');
  const selection = read('src/main/profile-selection-enhancements.js');
  const css = read('src/main/css/2.0.41.css');
  assert(index.includes('id="profileSearch"'));
  assert(search.includes('function filterProfiles()'));
  assert(selection.includes("link.classList.add('profile-selected')"));
  assert(css.includes('border: 2px solid #fff !important'));
});

check('Phase 1 dead files remain removed', () => {
  for (const relative of [
    'src/main/coin-form-layout-enhancements.js',
    'src/main/css/2.0.37.css',
    'scripts/coin-layout-regression-tests.js',
    'scripts/generate-icons.js',
    'build/icon.png'
  ]) assert.strictEqual(exists(relative), false, `${relative} should remain removed`);
  assert(!read('src/main/utils.js').includes('testSleep'));
});

check('Phase 2 v1 storage and migration implementations remain removed', () => {
  assert.strictEqual(exists('src/main/backup-manager.js'), false);
  const legacyVaultStub = read('src/main/vault.js');
  const encryption = read('src/main/encryption.js');
  const robust = read('src/main/robust-vault.js');
  const session = read('src/main/crypto-session-main.js');
  assert(legacyVaultStub.includes('Transitional renderer compatibility stub'));
  assert(!legacyVaultStub.includes('initVaultList'));
  assert(!legacyVaultStub.includes('rotateCrypto'));
  assert(!encryption.includes('aes-256-cbc'));
  assert(!encryption.includes('isLegacyEncryptedPayload'));
  assert(!robust.includes('migrateLegacyEncryption'));
  assert(!robust.includes('rotateCrypto'));
  assert(!session.includes('migrateLegacySession'));
  assert(session.includes('unsupported-legacy-data'));
});

check('updated runtime JavaScript parses cleanly', () => {
  for (const relative of [
    'src/main/detail-actions.js',
    'src/main/detail-action-enhancements.js',
    'src/main/login-retry-guard.js',
    'src/main/form-spacing-enhancements.js',
    'src/main/search-enhancements.js',
    'src/main/detail-spacing-enhancements.js',
    'src/main/edit-form-grid-enhancements.js',
    'src/main/edit-security-enhancements.js',
    'src/main/profile-selection-enhancements.js',
    'src/main/settings-enhancements.js',
    'src/main/lockout-state.js',
    'src/main/lockout-ui-enhancements.js',
    'src/main/record.js',
    'src/main/group.js',
    'src/main/main.js',
    'src/main/robust-vault.js',
    'src/main/argon2-provider.js',
    'src/main/key-envelope.js',
    'src/main/crypto-session-main.js',
    'src/main/crypto-ui-bridge.js',
    'src/main/encryption.js',
    'src/main/vault.js',
    'scripts/readme-to-pdf.js',
    'scripts/electron-crypto-smoke.js',
    'scripts/run-electron-crypto-smoke.js',
    'scripts/v2-only-crypto-regression-tests.js'
  ]) syntaxCheck(relative);
});

console.log(`\n${passed} SafeLedger 2.0.48 UI/runtime regression checks passed.`);
