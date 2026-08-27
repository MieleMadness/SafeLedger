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

check('shared detail actions are direct and observer-free', () => {
  const index = read('src/main/index.html');
  const preload = read('src/main/preload.js');
  const actions = read('src/main/detail-actions.js');
  const css = read('src/main/css/site.css');
  assert(index.includes('id="detailActionArea"'));
  assert(!preload.includes("require('./detail-action-enhancements.js')"));
  assert.strictEqual(exists('src/main/detail-action-enhancements.js'), false);
  assert(!actions.includes('MutationObserver'));
  assert(!actions.includes('detail-action-context-marker'));
  assert(css.includes('.detail-action-area'));
});

check('Profile view edit delete and search render directly', () => {
  const renderer = read('src/main/renderer.js');
  const profile = read('src/main/profile.js');
  assert(renderer.includes("const profile = require('./profile')"));
  assert(!renderer.includes('createEditVault'));
  assert(!renderer.includes('showVaultDetail'));
  assert(profile.includes('function listProfiles(params)'));
  assert(profile.includes('function createEditProfile(params)'));
  assert(profile.includes('function showProfileDetail(params)'));
  assert(profile.includes("icon: 'fa-pencil', title: 'Edit profile'"));
  assert(profile.includes("icon: 'fa-print', title: 'Print profile'"));
  assert(profile.includes("icon: 'fa-trash', title: 'Delete profile'"));
  assert(profile.includes("document.getElementById('profileSearch')"));
});

check('Profile user data uses text nodes rather than HTML injection', () => {
  const profile = read('src/main/profile.js');
  assert(profile.includes("header.textContent = profile.name || 'Profile'"));
  assert(profile.includes("label.textContent = item.name || ''"));
  assert(!profile.includes('header.innerHTML = profile'));
  assert(!profile.includes('link.innerHTML'));
});

check('Settings render directly without legacy form mutation', () => {
  const renderer = read('src/main/renderer.js');
  const settings = read('src/main/settings-ui.js');
  const preload = read('src/main/preload.js');
  assert(renderer.includes("const settingsUi = require('./settings-ui')"));
  assert(renderer.includes('settingsUi.show({ settings, saving })'));
  assert.strictEqual(exists('src/main/settings-enhancements.js'), false);
  assert(!preload.includes("require('./settings-enhancements.js')"));
  assert(!settings.includes('MutationObserver'));
  assert(!settings.includes('cloneNode'));
  assert(settings.includes("makeSection('Password')"));
  assert(settings.includes("makeSection('Backup & Recovery')"));
  assert(settings.includes("makeSection('Brute Force Protection')"));
});

check('hidden compatibility action buttons are removed', () => {
  const index = read('src/main/index.html');
  const settings = read('src/main/settings-ui.js');
  assert(!index.includes('legacy-hidden-actions'));
  assert(!index.includes('id="encryptionSettings"'));
  assert(!index.includes('id="backupButton"'));
  assert(!index.includes('id="restoreButton"'));
  assert(settings.includes('encryption.showEncrptionDetail()'));
  assert(settings.includes('securityEnhancements.exportEncryptedBackup()'));
  assert(settings.includes('securityEnhancements.restoreEncryptedBackup()'));
});

check('delete confirmations expose direct cancel actions', () => {
  const profile = read('src/main/profile.js');
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  assert(profile.includes("title: 'Cancel delete profile'"));
  assert(record.includes("title: 'Cancel delete coin'"));
  assert(group.includes("title: 'Cancel delete wallet'"));
  for (const source of [profile, record, group]) {
    assert(source.includes("icon: 'fa-times'"));
    assert(source.includes("className: 'detail-action-cancel'"));
  }
});

check('coin empty public address and private-key display behavior remain intact', () => {
  const record = read('src/main/record.js');
  assert(record.includes('Use edit button to update asset.'));
  assert(record.includes("classList.add('public-address-placeholder')"));
  assert(record.includes("if (String(params.record.privateAddress || '').trim())"));
});

check('Coin Wallet and Profile actions use one normalized order', () => {
  const profile = read('src/main/profile.js');
  const record = read('src/main/record.js');
  const group = read('src/main/group.js');
  for (const source of [profile, record, group]) {
    const edit = source.indexOf("icon: 'fa-pencil'");
    const print = source.indexOf("icon: 'fa-print'");
    const remove = source.indexOf("icon: 'fa-trash'");
    assert(edit >= 0 && print > edit && remove > print);
  }
});

check('Profile search no longer needs a DOM observer', () => {
  const index = read('src/main/index.html');
  const search = read('src/main/search-enhancements.js');
  const profile = read('src/main/profile.js');
  assert(index.includes('id="profileSearch"'));
  assert(index.includes('id="profileSearchClear"'));
  assert(search.includes("setupSearchClear('profileSearch', 'profileSearchClear')"));
  assert(!search.includes('MutationObserver'));
  assert(!search.includes('filterProfiles'));
  assert(profile.includes("const query = normalize(search && search.value)"));
});

check('shared Settings limits come from one schema', () => {
  const ui = read('src/main/settings-ui.js');
  const manager = read('src/main/installManager/installManager/settingsManager.js');
  const schema = read('src/main/settings-schema.js');
  assert(ui.includes("require('./settings-schema')"));
  assert(manager.includes("require('../../settings-schema')"));
  assert(schema.includes('const BRUTE_FORCE_MIN = 1'));
  assert(schema.includes('const BRUTE_FORCE_MAX = 99'));
});

check('startup screen is independent from Settings', () => {
  const preload = read('src/main/preload.js');
  const startup = read('src/main/startup-ui.js');
  assert(preload.includes("require('./startup-ui.js')"));
  assert(startup.includes("ipc.on('result-init-system', dismissStartupScreen)"));
  assert(startup.includes('Opening your secure workspace'));
});

check('Electron-safe Argon2 provider remains bundled', () => {
  const pkg = JSON.parse(read('package.json'));
  const provider = read('src/main/argon2-provider.js');
  const envelope = read('src/main/key-envelope.js');
  assert.strictEqual(pkg.version, '2.0.53');
  assert.strictEqual(pkg.dependencies['hash-wasm'], '4.12.0');
  assert(provider.includes("CURRENT_IMPLEMENTATION = 'hash-wasm-argon2id-v1'"));
  assert(envelope.includes('argon2Provider.CURRENT_IMPLEMENTATION'));
});

check('Windows and Linux crypto build gates remain enabled', () => {
  const windows = read('.github/workflows/windows-portable.yml');
  const linux = read('.github/workflows/linux-appimage.yml');
  assert(windows.includes('npm run test:electron-crypto'));
  assert(linux.includes('npm run test:electron-crypto'));
  assert(windows.includes("Get-ChildItem -Path dist -Filter 'SafeLedger-*-Portable.exe'"));
});

check('failed password retry guard remains active', () => {
  const preload = read('src/main/preload.js');
  const guard = read('src/main/login-retry-guard.js');
  assert(preload.includes("require('./login-retry-guard.js')"));
  assert(guard.includes('params.settings && params.settings.lockLogin'));
  assert(guard.includes("document.getElementById('loginBtn')"));
});

check('updated UI modules parse cleanly', () => {
  for (const relative of [
    'src/main/detail-actions.js',
    'src/main/profile.js',
    'src/main/settings-ui.js',
    'src/main/settings-schema.js',
    'src/main/startup-ui.js',
    'src/main/login-retry-guard.js',
    'src/main/search-enhancements.js',
    'src/main/edit-form-ui.js',
    'src/main/security-ui.js',
    'src/main/lockout-state.js',
    'src/main/lockout-ui-enhancements.js',
    'src/main/record.js',
    'src/main/group.js',
    'src/main/main.js',
    'src/main/preload.js',
    'src/main/renderer.js',
    'src/main/robust-vault.js',
    'src/main/argon2-provider.js',
    'src/main/key-envelope.js'
  ]) syntaxCheck(relative);
});

console.log('\n16 SafeLedger 2.0.53 direct UI/runtime regression checks passed.');
