'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

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
  assert(source.includes('minWidth: 900'));
  assert(source.includes('minHeight: 600'));
});

check('new installations name the first profile SafeLedger', () => {
  const source = read('src/main/robust-vault.js');
  assert(source.includes("name: 'SafeLedger'"));
  assert(!source.includes("name: 'Initial Profile'"));
});

check('shared bottom detail-action dock is present', () => {
  const index = read('src/main/index.html');
  const preload = read('src/main/preload.js');
  const css = read('src/main/css/site.css');
  assert(index.includes('id="detailActionArea"'));
  assert(preload.includes("require('./detail-action-enhancements.js')"));
  assert(css.includes('.detail-action-area'));
  assert(css.includes('.emergency-lock-cell .panic-lock-inline'));
});

check('coin empty public address and private-key display behavior remain intact', () => {
  const record = read('src/main/record.js');
  assert(record.includes('Use edit button to update asset.'));
  assert(record.includes("classList.add('public-address-placeholder')"));
  assert(record.includes("if (String(params.record.privateAddress || '').trim())"));
});

check('coin wallet and profile actions retain the normalized bottom dock', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  assert(enhancements.includes("const ACTION_ORDER = ['edit', 'print', 'delete'];"));
  for (const source of [record, group]) {
    assert(source.includes("icon: 'fa-print'"));
    assert(source.includes("icon: 'fa-pencil'"));
    assert(source.includes("icon: 'fa-trash'"));
    assert(source.includes("icon: 'fa-save'"));
  }
  assert(enhancements.includes("title: 'Save profile'"));
  assert(enhancements.includes("title: 'Edit profile'"));
  assert(enhancements.includes("title: 'Print profile'"));
  assert(enhancements.includes("title: 'Delete profile'"));
});

check('delete confirmations retain cancel actions', () => {
  const enhancements = read('src/main/detail-action-enhancements.js');
  assert(enhancements.includes("if (/^Confirm Delete of coin:/i.test(value)) return 'coin';"));
  assert(enhancements.includes("if (/^Confirm Delete of wallet:/i.test(value)) return 'wallet';"));
  assert(enhancements.includes("if (/^Confirm delete of profile:/i.test(value)) return 'profile';"));
  assert(enhancements.includes("button.innerHTML = '<i class=\"fa fa-times\" aria-hidden=\"true\"></i>';"));
});

check('Electron-safe Argon2 provider remains bundled', () => {
  const pkg = JSON.parse(read('package.json'));
  const provider = read('src/main/argon2-provider.js');
  const envelope = read('src/main/key-envelope.js');
  assert.strictEqual(pkg.version, '2.0.53');
  assert.strictEqual(pkg.dependencies['hash-wasm'], '4.12.0');
  assert.strictEqual(pkg.scripts['test:electron-crypto'], 'node scripts/run-electron-crypto-smoke.js');
  assert(provider.includes("CURRENT_IMPLEMENTATION = 'hash-wasm-argon2id-v1'"));
  assert(envelope.includes('argon2Provider.CURRENT_IMPLEMENTATION'));
});

check('Windows artifact stays flat with PDF README', () => {
  const windows = read('.github/workflows/windows-portable.yml');
  const linux = read('.github/workflows/linux-appimage.yml');
  const pkg = JSON.parse(read('package.json'));
  assert(windows.includes('npm run test:electron-crypto'));
  assert(windows.includes("Get-ChildItem -Path dist -Filter 'SafeLedger-*-Portable.exe'"));
  assert(windows.includes('Copy-Item $exe.FullName -Destination release/windows/'));
  assert(windows.includes('npm run docs:pdf -- release/windows/README.pdf'));
  assert(windows.includes('path: release/windows/*'));
  assert.strictEqual(pkg.scripts['docs:pdf'], 'electron scripts/readme-to-pdf.js');
  assert(linux.includes('npm run test:electron-crypto'));
});

check('failed password retry guard remains active', () => {
  const preload = read('src/main/preload.js');
  const guard = read('src/main/login-retry-guard.js');
  assert(preload.includes("require('./login-retry-guard.js')"));
  assert(guard.includes('params.settings && params.settings.lockLogin'));
  assert(guard.includes("document.getElementById('loginBtn')"));
  assert(guard.includes('button.disabled = false'));
});

check('Coin and Wallet forms render their final grid directly', () => {
  const index = read('src/main/index.html');
  const css = read('src/main/css/site.css');
  const formUi = read('src/main/edit-form-ui.js');
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  assert(index.includes('./css/site.css'));
  assert(!index.includes('./css/2.0.'));
  assert(css.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'));
  assert(css.includes('.edit-sensitive-shell'));
  assert(formUi.includes("form.className = 'safeledger-edit-form'"));
  assert(formUi.includes("grid.className = 'edit-info-grid'"));
  assert(record.includes("const editFormUi = require('./edit-form-ui');"));
  assert(group.includes("const editFormUi = require('./edit-form-ui');"));
});

check('detail view/edit spacing is controlled without a second observer', () => {
  const index = read('src/main/index.html');
  const actions = read('src/main/detail-actions.js');
  assert(!index.includes("require('./detail-spacing-enhancements.js')"));
  assert.strictEqual(exists('src/main/detail-spacing-enhancements.js'), false);
  assert(actions.includes("const DETAIL_MODE_CLASSES = ['wallet-coin-detail', 'wallet-coin-view', 'wallet-coin-edit'];"));
  assert(actions.includes("if (titles.some((title) => title === 'save coin' || title === 'save wallet')) return 'edit';"));
  assert(actions.includes("if (titles.some((title) => title === 'edit coin' || title === 'edit wallet')) return 'view';"));
  assert(actions.includes('setDetailMode(modeForActions(actions));'));
});

check('profile search matches wallet and coin search', () => {
  const index = read('src/main/index.html');
  const search = read('src/main/search-enhancements.js');
  assert(index.includes('id="profileSearch"'));
  assert(index.includes('placeholder="Search profiles..."'));
  assert(index.includes('id="profileSearchClear"'));
  assert(search.includes("setupSearchClear('profileSearch', 'profileSearchClear')"));
  assert(search.includes('function filterProfiles()'));
});

check('selected Profile row is CSS-driven without a MutationObserver', () => {
  const index = read('src/main/index.html');
  const css = read('src/main/css/site.css');
  assert(!index.includes("require('./profile-selection-enhancements.js')"));
  assert.strictEqual(exists('src/main/profile-selection-enhancements.js'), false);
  assert(css.includes('#vaultArea .badge-circle.badge-selected'));
  assert(css.includes('border: 0 !important'));
  assert(css.includes('a:has(.badge-selected)'));
  assert(css.includes('border: 2px solid #fff !important'));
});

check('obsolete Phase 1 and Phase 3 files stay removed', () => {
  const removed = [
    'src/main/coin-form-layout-enhancements.js',
    'src/main/css/2.0.37.css',
    'scripts/coin-layout-regression-tests.js',
    'scripts/generate-icons.js',
    'build/icon.png',
    'src/main/form-spacing-enhancements.js',
    'src/main/edit-form-grid-enhancements.js',
    'src/main/edit-security-enhancements.js',
    'src/main/detail-spacing-enhancements.js',
    'src/main/profile-selection-enhancements.js'
  ];
  for (const relative of removed) assert.strictEqual(exists(relative), false, `${relative} should remain removed`);
  assert(!read('src/main/utils.js').includes('testSleep'));
});

check('updated renderer and crypto JavaScript parses cleanly', () => {
  for (const relative of [
    'src/main/detail-actions.js',
    'src/main/detail-action-enhancements.js',
    'src/main/login-retry-guard.js',
    'src/main/search-enhancements.js',
    'src/main/edit-form-ui.js',
    'src/main/security-ui.js',
    'src/main/settings-enhancements.js',
    'src/main/lockout-state.js',
    'src/main/lockout-ui-enhancements.js',
    'src/main/record.js',
    'src/main/group.js',
    'src/main/main.js',
    'src/main/preload.js',
    'src/main/robust-vault.js',
    'src/main/argon2-provider.js',
    'src/main/key-envelope.js',
    'scripts/readme-to-pdf.js',
    'scripts/electron-crypto-smoke.js',
    'scripts/run-electron-crypto-smoke.js'
  ]) syntaxCheck(relative);
});

console.log('\n15 SafeLedger 2.0.53 UI/runtime regression checks passed.');
