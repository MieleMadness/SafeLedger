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
const bootstrap = read('src/main/bootstrap.js');
const sessionLock = read('src/main/session-lock-main.js');
const preload = read('src/main/preload.js');
const index = read('src/main/index.html');
const entry = read('src/main/renderer-entry.js');
const security = read('src/main/security-enhancements.js');
const securityMain = read('src/main/security-main.js');
const build = read('scripts/build-renderer.js');

assert(/^2\.\d+\.\d+$/.test(pkg.version));
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

assert(!main.includes("ipc.on('panic-lock'"), 'Emergency Lock must not have a second owner in main.js.');
assert(!bootstrap.includes("removeAllListeners('panic-lock')"), 'Bootstrap must not repair duplicate Emergency Lock listeners at runtime.');
const panicLockStart = bootstrap.indexOf("ipc.on('panic-lock'");
const panicLockEnd = bootstrap.indexOf("ipc.handle('device-storage-health'", panicLockStart);
assert(panicLockStart >= 0 && panicLockEnd > panicLockStart, 'Bootstrap must own the Emergency Lock IPC route.');
const panicLockBlock = bootstrap.slice(panicLockStart, panicLockEnd);
assert(panicLockBlock.includes('lockController.lockSession'), 'Emergency Lock must use the centralized session-lock controller.');
assert(!panicLockBlock.includes('cryptoSession.clearSession()'), 'Emergency Lock IPC must not duplicate DEK cleanup outside the session-lock controller.');
assert(sessionLock.includes('cryptoSession.clearSession();'), 'Central session lock must clear the active encryption session.');
assert(sessionLock.indexOf('cryptoSession.clearSession();') < sessionLock.indexOf("win.webContents.send('security-session-locked'"),
  'Central session lock must clear the DEK before touching renderer UI.');
assert(sessionLock.includes('win.webContents.reload()'), 'Central session lock must reset the renderer to the login screen.');

assert(preload.includes("const { contextBridge, ipcRenderer } = require('electron')"));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerApi'"));
assert(!preload.includes("require('./"));
assert(index.includes('./renderer.bundle.js'));
assert(!index.includes('bootstrap.min.css'));
assert(!index.includes('font-awesome.min.css'));
assert(!index.includes('jquery.min.js'));
assert(!index.includes('bootstrap.min.js'));
assert(entry.includes("dataset.safeLedgerRendererReady = 'true'"));
assert(build.includes("platform: 'browser'"));
assert(!build.includes('safeledger-electron-shim'));
assert(!build.includes('renderer-electron-shim'));
assert(build.includes('forbidden runtime dependency'));
assert(!security.includes("require('fs')"));
assert(!security.includes("require('path')"));
assert(!security.includes('MutationObserver'));
assert(security.includes("ipc.invoke('security-backup-all')"));
assert(security.includes("ipc.invoke('security-verify-backup', password)"),
  'Verify Backup must pass the transient backup password to the trusted main-process verifier');
assert(security.includes('requestBackupPassword()'),
  'Verify Backup must challenge for the backup password instead of relying on the live session key');
assert(security.includes("ipc.invoke('security-restore-all')"));
assert(securityMain.includes("ipc.handle('security-backup-all'"));
assert(securityMain.includes("ipc.handle('security-verify-backup'"));
assert(securityMain.includes("ipc.handle('security-restore-all'"));
assert(securityMain.includes('assertTrustedEvent'));
assert(securityMain.includes('assertUnlocked'));
assert(securityMain.includes('cryptoSession.clearSession()'));
assert(securityMain.includes('stageRestore'));
assert(securityMain.includes("require('./atomic-file')"));
assert(pkg.scripts['test:gui-smoke'].includes('run-gui-smoke.js'));

for (const relative of [
  'src/main/bootstrap.js', 'src/main/main.js', 'src/main/session-lock-main.js',
  'src/main/preload.js', 'src/main/security-main.js',
  'src/main/security-enhancements.js', 'src/main/profile-transaction.js',
  'src/main/renderer-bridge.js', 'src/main/renderer-entry.js', 'src/main/atomic-file.js',
  'src/main/vault-schema.js', 'src/main/legacy-import.js',
  'scripts/continuity-hardening-tests.js', 'scripts/recovery-confidence-tests.js',
  'scripts/build-renderer.js', 'scripts/run-gui-smoke.js', 'scripts/version-bump-check.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log('PASS SafeLedger sandbox, single-owner Emergency Lock, independent backup verification bridge, real GUI smoke hooks, and main-process security operations.');
