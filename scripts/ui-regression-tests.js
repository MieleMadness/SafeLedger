'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const syntaxCheck = (relative) => execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

const pkg = JSON.parse(read('package.json'));
const main = read('src/main/main.js');
const bootstrap = read('src/main/bootstrap.js');
const windowSizing = read('src/main/window-sizing-main.js');
const preload = read('src/main/preload.js');
const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const bridge = read('src/main/renderer-bridge.js');
const renderer = read('src/main/renderer.js');
const settings = read('src/main/settings-ui.js');
const passwordUi = read('src/main/password-settings-ui.js');
const security = read('src/main/security-enhancements.js');
const securityUi = read('src/main/security-ui.js');
const profile = read('src/main/profile.js');
const record = read('src/main/record.js');
const group = read('src/main/group.js');
const presentation = read('src/main/vault-item-presentation.js');
const css = read('src/main/css/site.css');

assert(main.includes('width: 1200'));
assert(main.includes('height: 750'));
assert.strictEqual(pkg.main, 'src/main/bootstrap.js');
assert(bootstrap.includes('function installPreferredWindowSizing()'));
assert(bootstrap.includes("app.on('browser-window-created'"));
assert(bootstrap.indexOf('installPreferredWindowSizing();') < bootstrap.indexOf("require('./main');"));
assert(windowSizing.includes('const PREFERRED_WIDTH = ') && windowSizing.includes('const PREFERRED_HEIGHT = 750;'));
const sizingPolicy = require('../src/main/window-sizing-main.js');
assert(Number.isInteger(sizingPolicy.PREFERRED_WIDTH) && sizingPolicy.PREFERRED_WIDTH >= 1200,
  'Trusted main-process sizing must keep an explicit desktop preferred width.');
assert.strictEqual(sizingPolicy.PREFERRED_HEIGHT, 750);
assert(!entry.includes("require('./ui-scale-2.6.7.js');"));
assert.strictEqual(exists('src/main/ui-scale-2.6.7.js'), false);
assert.strictEqual(exists('src/main/startup.js'), false);
assert(index.includes('id="detailActionArea"'));
assert(index.includes('<script src="./renderer.bundle.js"></script>'));
assert(index.includes('Search assets...'));
assert(index.includes('Add Asset'));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerApi'"));
assert(!preload.includes("require('./renderer.js')"));
assert(entry.includes("require('./renderer.js')"));
assert(entry.includes("require('./security-enhancements.js')"));
assert(entry.includes("require('./lockout-ui-enhancements.js')"));
assert(bridge.includes('Blocked SafeLedger bridge send'));
assert(bridge.includes('Blocked SafeLedger bridge invoke'));
assert(!bridge.includes("require('electron')"));
assert.strictEqual(exists('src/main/renderer-electron-shim.js'), false);
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
assert(record.includes("title: 'Cancel delete asset'"));
assert(group.includes("title: 'Cancel delete vault item'"));
assert(renderer.includes("const profile = require('./profile')"));
assert(renderer.includes("const settingsUi = require('./settings-ui')"));
assert(group.includes("require('./vault-item-presentation')"));
assert(!presentation.includes('MutationObserver'));

// Asset and Vault Item detail views use the same readable typography and notes treatment.
assert(record.includes("className: 'detail-notes-input'"));
assert(group.includes("className: 'detail-notes-input'"));
assert(record.includes("notesWrap.className = 'detail-notes-section'"));
assert(group.includes("notesWrap.className = 'detail-notes-section'"));
assert(record.includes("notesValue.className = 'outData detail-notes-value'"));
assert(group.includes("notesValue.className = 'outData detail-notes-value'"));
assert(group.includes("appendDetailLine(area, 'Created', params.group.created, formatLocalDate)"));
assert(group.includes("appendDetailLine(area, 'Modified', params.group.modified, formatLocalDate)"));
assert(group.includes("header.className = 'wallet-detail-header'"));
assert(group.includes("title.className = 'wallet-detail-title'"));
assert(group.includes("icon.classList.add('wallet-detail-brand-image')"));
assert(css.includes('#detailArea { padding-top: 2px; font-size: 14px; line-height: 1.45; }'));
assert(css.includes('.wallet-list-category { display: block; margin-top: 2px; font-size: 12px;'));
assert(css.includes('.wallet-detail-title { margin: 0 !important; font-size: 30px;'));
assert(css.includes('.wallet-detail-category { margin: 4px 0 8px; color: #5f6672; font-size: 13px;'));
assert(css.includes('.detail-notes-value { margin-top: 5px; padding: 9px 10px;'));

// Balance timestamp belongs to the protected Balance disclosure instead of a separate detail row.
assert(record.includes("label: 'Balance updated'"));
assert(record.includes('value: formatLocalDate(params.record.balanceUpdated)'));
assert(!record.includes("addLine('Balance updated'"));
assert(securityUi.includes("meta.className = 'sensitive-field-meta'"));
assert(css.includes('.sensitive-field-meta { margin: 8px 0 0; color: #5f6672; font-size: 13px;'));

for (const relative of [
  'src/main/bootstrap.js', 'src/main/window-sizing-main.js',
  'src/main/preload.js', 'src/main/renderer-entry.js', 'src/main/renderer-bridge.js',
  'src/main/security-main.js', 'src/main/security-enhancements.js', 'src/main/security-ui.js',
  'src/main/password-policy.js', 'src/main/password-controls.js', 'src/main/password-settings-ui.js',
  'src/main/crypto-ui-bridge.js', 'src/main/settings-ui.js', 'src/main/main.js',
  'src/main/record.js', 'src/main/group.js', 'src/main/vault-item-presentation.js',
  'src/main/custom-fields-ui.js'
]) syntaxCheck(relative);

console.log('PASS direct UI modules, trusted-bootstrap startup sizing policy, and shared Asset/Vault Item typography remain behind the explicit sandbox bridge.');
