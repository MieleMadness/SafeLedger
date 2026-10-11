'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(read('package.json'));
const bootstrap = read('src/main/bootstrap.js');
const main = read('src/main/main.js');
const sessionLock = read('src/main/session-lock-main.js');

assert.strictEqual(pkg.main, 'src/main/bootstrap.js', 'bootstrap.js must remain the Electron entry point.');
assert(bootstrap.includes('function startAllowedRuntime()') && bootstrap.includes('function startBlockedRuntime('),
  'Bootstrap must explicitly own both allowed and blocked startup paths.');
assert(bootstrap.includes('installPreferredWindowSizing();'));
assert(bootstrap.indexOf('installPreferredWindowSizing();') < bootstrap.indexOf("const mainRuntime = require('./main');"),
  'Trusted native window sizing must be installed before the core runtime can create a window.');
assert(bootstrap.includes('mainRuntime.registerCoreIpcHandlers();'),
  'Bootstrap must explicitly register the core main-process IPC service.');
assert(bootstrap.includes('mainRuntime.createWindow();'),
  'Bootstrap must explicitly create the primary application window.');
assert(bootstrap.includes("app.on('window-all-closed'"));
assert(bootstrap.includes("app.on('activate'"));
assert(bootstrap.includes("app.on('before-quit'"));
assert(bootstrap.includes('mainRuntime.clearSession();') && bootstrap.includes('deviceSecurity.stop();'),
  'The sole lifecycle owner must tear down cryptographic and device-security session state.');

for (const forbidden of [
  'app.whenReady().then(createWindow)',
  "app.on('window-all-closed'",
  "app.on('activate'",
  "app.on('before-quit'"
]) {
  assert(!main.includes(forbidden), `main.js must not self-own Electron lifecycle behavior: ${forbidden}`);
}

const registrationStart = main.indexOf('function registerCoreIpcHandlers()');
assert(registrationStart > 0, 'main.js must expose an explicit core IPC registration function.');
const beforeRegistration = main.slice(0, registrationStart);
assert(!beforeRegistration.includes('ipc.on(') && !beforeRegistration.includes('ipc.handle('),
  'Requiring main.js must not register application IPC handlers as a module side effect.');
assert(!beforeRegistration.includes('cryptoSession.registerIpcHandlers(') && !beforeRegistration.includes('securityMain.registerIpcHandlers('),
  'Trusted subsystem IPC registration must occur only inside the explicit registration function.');
assert(main.includes('if (coreIpcRegistered) return false;') && main.includes('coreIpcRegistered = true;'),
  'Core IPC registration must be idempotent.');
assert(main.includes('module.exports = {') && main.includes('registerCoreIpcHandlers') && main.includes('createWindow') && main.includes('getMainWindow'),
  'main.js must behave as an explicit service module rather than a second composition root.');

assert(!main.includes("ipc.on('panic-lock'"), 'The retired Emergency Lock listener must be absent from main.js.');
assert(!bootstrap.includes("removeAllListeners('panic-lock')"),
  'Bootstrap must never replace SafeLedger-owned listeners with removeAllListeners().');
const panicMatches = bootstrap.match(/ipc\.on\('panic-lock'/g) || [];
assert.strictEqual(panicMatches.length, 1, 'Emergency Lock must have exactly one IPC owner.');
const panicStart = bootstrap.indexOf("ipc.on('panic-lock'");
const panicEnd = bootstrap.indexOf("ipc.handle('device-storage-health'", panicStart);
const panicBlock = bootstrap.slice(panicStart, panicEnd);
assert(panicBlock.includes('lockController.lockSession'), 'Emergency Lock must delegate to the centralized session-lock controller.');
assert(!panicBlock.includes('cryptoSession.clearSession()') && !panicBlock.includes('webContents.reload()'),
  'Emergency Lock IPC must not duplicate lock-controller internals.');
assert(sessionLock.includes('cryptoSession.clearSession();'));
assert(sessionLock.includes('clearSessionOnlyState();'));
assert(sessionLock.includes("win.webContents.send('security-session-locked'"));
assert(sessionLock.includes('win.webContents.reload()'));

const blockedStart = bootstrap.indexOf('function startBlockedRuntime(');
const allowedStart = bootstrap.indexOf('function startAllowedRuntime()');
assert(allowedStart >= 0 && blockedStart > allowedStart);
const blockedBlock = bootstrap.slice(blockedStart, bootstrap.indexOf('const startupStorageStatus', blockedStart));
assert(!blockedBlock.includes("require('./main')"),
  'Blocked portable startup must not load the normal application runtime.');
assert(!blockedBlock.includes('registerCoreIpcHandlers'),
  'Blocked portable startup must not register normal application IPC routes.');
assert(blockedBlock.includes('cryptoSession.clearSession();') && blockedBlock.includes('app.quit();'),
  'Blocked startup must fail closed and clear any cryptographic session state.');

for (const relative of [
  'src/main/bootstrap.js',
  'src/main/main.js',
  'src/main/session-lock-main.js',
  'scripts/main-process-ownership-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} has one main-process composition root, explicit IPC registration, and one centralized Emergency Lock owner.`);
