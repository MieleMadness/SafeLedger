'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const syntaxCheck = (relative) => execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

const main = read('src/main/main.js');
const preload = read('src/main/preload.js');
const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const shim = read('src/main/renderer-electron-shim.js');
const renderer = read('src/main/renderer.js');
const settings = read('src/main/settings-ui.js');
const passwordUi = read('src/main/password-settings-ui.js');
const security = read('src/main/security-enhancements.js');
const profile = read('src/main/profile.js');
const record = read('src/main/record.js');
const group = read('src/main/group.js');

assert(main.includes('width: 1200'));
assert(main.includes('height: 750'));
assert(index.includes('id="detailActionArea"'));
assert(index.includes('<script src="./renderer.bundle.js"></script>'));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerApi'"));
assert(!preload.includes("require('./renderer.js')"));
assert(entry.includes("require('./renderer.js')"));
assert(entry.includes("require('./security-enhancements.js')"));
assert(entry.includes("require('./lockout-ui-enhancements.js')"));
assert(shim.includes('Blocked SafeLedger IPC send'));
assert(shim.includes('Blocked SafeLedger IPC invoke'));
assert.strictEqual(exists('src/main/settings-enhancements.js'), false);
assert.strictEqual(exists('src/main/detail-action-enhancements.js'), false);
assert.strictEqual(exists('src/main/login-retry-guard.js'), false);
assert(!security.includes('MutationObserver'));
assert(!security.includes("require('fs')"));
assert(!security.includes("require('path')"));
assert(settings.includes("const passwordSettingsUi = require('./password-settings-ui')"));
assert(settings.includes('passwordSettingsUi.show()'));
assert(passwordUi.includes("'inputConfirmNewPassword'"));
assert(passwordUi.includes('passwordControls.configure'));
assert(profile.includes("title: 'Cancel delete profile'"));
assert(record.includes("title: 'Cancel delete coin'"));
assert(group.includes("title: 'Cancel delete wallet'"));
assert(renderer.includes("const profile = require('./profile')"));
assert(renderer.includes("const settingsUi = require('./settings-ui')"));

for (const relative of [
  'src/main/preload.js', 'src/main/renderer-entry.js', 'src/main/renderer-electron-shim.js',
  'src/main/security-main.js', 'src/main/security-enhancements.js', 'src/main/password-policy.js',
  'src/main/password-controls.js', 'src/main/password-settings-ui.js', 'src/main/crypto-ui-bridge.js',
  'src/main/settings-ui.js', 'src/main/main.js'
]) syntaxCheck(relative);

console.log('PASS direct UI modules run behind a narrow sandbox bridge without legacy observers.');
