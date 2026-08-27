'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const pkg = JSON.parse(read('package.json'));
const main = read('src/main/main.js');
const preload = read('src/main/preload.js');
const index = read('src/main/index.html');
const renderer = read('src/main/renderer.js');
const cryptoUi = read('src/main/crypto-ui-bridge.js');
const security = read('src/main/security-enhancements.js');

assert.strictEqual(pkg.version, '2.0.53');
assert.strictEqual(pkg.dependencies['@electron/remote'], undefined);
assert.strictEqual(exists('src/main/preload-compat.js'), false);

assert(!main.includes('@electron/remote'));
assert(!main.includes('remoteMain'));
assert(main.includes("const cryptoSession = require('./crypto-session-main')"));
assert(main.includes('cryptoSession.registerIpcHandlers()'));
assert(main.includes('nodeIntegration: false'));
assert(main.includes('contextIsolation: true'));
assert(main.includes('sandbox: false'));
assert(main.includes("preload: path.join(__dirname, 'preload.js')"));
assert(main.includes("ipc.on('panic-lock'"));
assert(main.includes('cryptoSession.clearSession()'));
assert(main.includes("ipc.handle('security-select-backup-destination'"));
assert(main.includes("ipc.handle('security-select-backup-source'"));

assert(preload.includes("const { contextBridge } = require('electron')"));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerRuntime'"));
assert(preload.includes("require('./renderer.js')"));
assert(!preload.includes('@electron/remote'));
assert(!preload.includes('preload-compat'));

assert(!index.includes('require('));
assert(index.includes('node_modules/jquery/dist/jquery.min.js'));
assert(index.includes('node_modules/bootstrap/dist/js/bootstrap.min.js'));

assert(!renderer.includes('electron.remote'));
assert(!renderer.includes('remote.getGlobal'));
assert(!renderer.includes('Your history has been cleared for your security'));
assert(!renderer.includes('event.preventDefault();\n  //alert("clean data")'));

assert(!cryptoUi.includes('electron.remote'));
assert(!cryptoUi.includes('remote.require'));
assert(!cryptoUi.includes('dataKeyHex'));
assert(!security.includes('electron.remote'));
assert(!security.includes('remote.dialog'));
assert(!security.includes('remote.getCurrentWindow'));
assert(security.includes("ipc.invoke('security-select-backup-destination'"));
assert(security.includes("ipc.invoke('security-select-backup-source'"));
assert(security.includes('portableRoot = params.portableRoot'));

for (const relative of [
  'src/main/main.js',
  'src/main/preload.js',
  'src/main/renderer.js',
  'src/main/crypto-ui-bridge.js',
  'src/main/security-enhancements.js'
]) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

console.log('PASS SafeLedger 2.0.53 Electron runtime hardening, main-only DEK session, and Remote removal.');
