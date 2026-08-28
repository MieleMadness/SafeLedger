'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const pkg = JSON.parse(read('package.json'));
const index = read('src/main/index.html');
const main = read('src/main/main.js');
const preload = read('src/main/preload.js');
const build = read('scripts/build-renderer.js');
const bridge = read('src/main/renderer-bridge.js');

assert.strictEqual(pkg.version, '2.2.0');
assert.strictEqual(pkg.dependencies.bootstrap, undefined);
assert.strictEqual(pkg.dependencies['font-awesome'], undefined);
assert.strictEqual(exists('src/main/renderer-electron-shim.js'), false);
assert(exists('src/main/renderer-bridge.js'));
assert(exists('src/main/css/foundation.css'));
assert(exists('src/main/css/local-icons.css'));
assert(!index.includes('bootstrap.min.css'));
assert(!index.includes('font-awesome.min.css'));
assert(index.includes('./css/foundation.css'));
assert(index.includes('./css/local-icons.css'));
assert(index.includes('app-grid app-search-row'));
assert(index.includes('app-grid app-main-row'));
assert(index.includes('app-grid app-button-row'));
assert(index.includes('Search assets...'));
assert(index.includes('Add Asset'));
assert(!index.includes('Search coins...'));
assert(!index.includes('Add Coin'));
assert(!build.includes('renderer-electron-shim'));
assert(!build.includes('safeledger-electron-shim'));
assert(main.includes('nodeIntegration: false'));
assert(main.includes('contextIsolation: true'));
assert(main.includes('sandbox: true'));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerApi'"));
assert(bridge.includes('window.safeLedgerApi'));
assert(!bridge.includes("require('electron')"));

const rendererFiles = [
  'renderer.js', 'profile.js', 'group.js', 'record.js',
  'crypto-ui-bridge.js', 'security-ui.js', 'security-enhancements.js'
];
for (const name of rendererFiles) {
  const source = read(`src/main/${name}`);
  assert(!source.includes("require('electron')"), `${name} still imports Electron`);
  assert(!source.includes('require("electron")'), `${name} still imports Electron`);
}

for (const name of fs.readdirSync(path.join(root, 'src', 'main')).filter((value) => value.endsWith('.js'))) {
  const source = read(`src/main/${name}`);
  assert(!source.includes('America/New_York'), `${name} hard-codes a geographic timezone`);
}

for (const relative of [
  'src/main/renderer-bridge.js', 'src/main/renderer.js', 'src/main/profile.js',
  'src/main/group.js', 'src/main/record.js', 'src/main/security-ui.js',
  'src/main/security-enhancements.js', 'src/main/crypto-ui-bridge.js',
  'scripts/build-renderer.js', 'scripts/runtime-modernization-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger 2.2 renderer boundary, native shell, terminology, and local-time modernization gates.');
