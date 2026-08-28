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
const entry = read('src/main/renderer-entry.js');
const security = read('src/main/security-enhancements.js');
const securityMain = read('src/main/security-main.js');
const build = read('scripts/build-renderer.js');

assert(/^2\.0\.\d+$/.test(pkg.version));
assert.strictEqual(pkg.devDependencies.esbuild, '0.28.2');
assert.strictEqual(pkg.dependencies.jquery, undefined);
assert.strictEqual(pkg.dependencies['@electron/remote'], undefined);
assert.strictEqual(exists('src/main/preload-compat.js'), false);
assert(main.includes('nodeIntegration: false'));
assert(main.includes('contextIsolation: true'));
assert(main.includes('sandbox: true'));
assert(!main.includes('sandbox: false'));
assert(main.includes("preload: path.join(__dirname, 'preload.js')"));
assert(main.includes("const securityMain = require('./security-main')"));
assert(main.includes('securityMain.registerIpcHandlers'));
assert(main.includes("process.env.SAFELEDGER_GUI_SMOKE === '1'"));
assert(main.includes('installGuiSmokeProbe'));
assert(preload.includes("const { contextBridge, ipcRenderer } = require('electron')"));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerApi'"));
assert(!preload.includes("require('./"));
assert(index.includes('./renderer.bundle.js'));
assert(index.includes('bootstrap.min.css'));
assert(!index.includes('jquery.min.js'));
assert(!index.includes('bootstrap.min.js'));
assert(entry.includes("dataset.safeLedgerRendererReady = 'true'"));
assert(build.includes("platform: 'browser'"));
assert(build.includes('safeledger-electron-shim'));
assert(build.includes('forbidden runtime dependency'));
assert(!security.includes("require('fs')"));
assert(!security.includes("require('path')"));
assert(!security.includes('MutationObserver'));
assert(security.includes("ipc.invoke('security-backup-all')"));
assert(security.includes("ipc.invoke('security-restore-all')"));
assert(securityMain.includes("ipc.handle('security-backup-all'"));
assert(securityMain.includes("ipc.handle('security-restore-all'"));
assert(securityMain.includes('assertTrustedEvent'));
assert(securityMain.includes('assertUnlocked'));
assert(securityMain.includes('cryptoSession.clearSession()'));
assert(securityMain.includes('stageRestore'));
assert(securityMain.includes("require('./atomic-file')"));
assert(pkg.scripts['test:gui-smoke'].includes('run-gui-smoke.js'));

for (const relative of [
  'src/main/main.js', 'src/main/preload.js', 'src/main/security-main.js',
  'src/main/security-enhancements.js', 'src/main/renderer-electron-shim.js',
  'src/main/renderer-entry.js', 'src/main/atomic-file.js',
  'scripts/build-renderer.js', 'scripts/run-gui-smoke.js', 'scripts/version-bump-check.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger sandbox, real GUI smoke hooks, reduced runtime dependencies, and main-process security operations.');
