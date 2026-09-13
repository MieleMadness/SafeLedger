'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const renderer = read('src/main/renderer.js');
const state = read('src/main/renderer-state.js');
const services = read('src/main/renderer-services.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const passwordUi = read('src/main/password-settings-ui.js');
const preload = read('src/main/preload.js');
const entry = read('src/main/renderer-entry.js');

assert.strictEqual(exists('src/main/renderer-bridge.js'), false,
  'The retired ipcRenderer compatibility facade must not return.');
assert.strictEqual(exists('src/main/settings-shortcut-ui.js'), false,
  'Settings navigation must remain renderer-owned instead of bouncing through main IPC.');

assert(state.includes('const state = {') && state.includes('module.exports = {\n  state,'),
  'Renderer state must have one explicit module owner.');
for (const field of ['settings', 'vaultList', 'vaultData', 'sessionUnlocked', 'saving']) {
  assert(state.includes(field), `Renderer state must retain ${field}.`);
}

assert(services.includes("window.safeLedgerApi"), 'Semantic services must terminate at the narrow preload API.');
for (const method of ['readProfile', 'saveProfile', 'deleteProfile', 'saveVaultItem', 'saveAsset', 'saveSettings', 'cryptoLogin', 'panicLock']) {
  assert(services.includes(`const ${method}`) || services.includes(`function ${method}`), `Renderer services must expose ${method}.`);
}
assert(!services.includes("require('electron')"), 'Renderer services must not regain Electron capability.');

assert(renderer.includes("const services = require('./renderer-services');"));
assert(renderer.includes("const rendererState = require('./renderer-state');"));
assert(!renderer.includes('renderer-bridge'), 'The coordinator must not depend on transport-level compatibility IPC.');
assert(!renderer.includes('ipc.send(') && !renderer.includes('ipc.invoke(') && !renderer.includes('ipc.on('),
  'The coordinator must use semantic services rather than IPC channel names.');
assert(renderer.includes("form.addEventListener('submit'"), 'The Login form owner must attach its own submit handler.');
assert(renderer.includes('cryptoUi.handleLogin(loginBtn)'), 'Login must call the crypto controller directly.');
assert(renderer.includes('settingsButton.addEventListener'), 'Settings navigation must be owned directly by the renderer.');

assert(!cryptoUi.includes("document.addEventListener('click'"),
  'Crypto behavior must not use a document-wide capture click bandaid.');
assert(!cryptoUi.includes('stopImmediatePropagation'), 'Crypto behavior must not suppress unrelated UI handlers.');
assert(!cryptoUi.includes('latestSettings') && !cryptoUi.includes('latestVaultList'),
  'Crypto UI must consume canonical renderer state instead of keeping shadow copies.');
assert(cryptoUi.includes("const rendererState = require('./renderer-state');"));
assert(cryptoUi.includes('services.cryptoLogin(') && cryptoUi.includes('services.cryptoChangePassword('));

assert(passwordUi.includes('function show()'));
assert(passwordUi.includes("const cryptoUi = require('./crypto-ui-bridge');") && passwordUi.includes('cryptoUi.handlePasswordChange(editBtn)'),
  'Change Password form must call the crypto controller directly from its own submit handler.');
assert(passwordUi.includes("form.addEventListener('submit'"),
  'Change Password must attach its handler while rendering the form.');
assert(!passwordUi.includes('stopImmediatePropagation'));

assert(preload.includes('let resultRequestQueue = Promise.resolve();'),
  'Shared legacy result-channel requests must be serialized at the preload boundary.');
assert(preload.includes('function requestResult('));
assert(preload.includes("readVault: (params) => requestResult('read', 'result', params)"));
assert(preload.includes("processRecord: (params) => requestResult('process-record', 'result', params)"));
assert(entry.includes("require('./renderer.js');"));
assert(!entry.includes('crypto-ui-bridge.js') && !entry.includes('settings-shortcut-ui.js'),
  'Renderer helpers must be composed by the coordinator rather than loaded as independent page patches.');

for (const relative of [
  'src/main/renderer.js',
  'src/main/renderer-state.js',
  'src/main/renderer-services.js',
  'src/main/crypto-ui-bridge.js',
  'src/main/password-settings-ui.js',
  'src/main/preload.js',
  'src/main/renderer-entry.js',
  'scripts/renderer-architecture-tests.js'
]) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log('PASS SafeLedger renderer uses one transient state owner, semantic services, direct control handlers, and no ipcRenderer compatibility facade.');
