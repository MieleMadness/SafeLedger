'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 18,
  'SafeLedger 2.6.18 trusted-bootstrap sizing regressions must remain active on 2.6.18 and later 2.6.x candidates.');
assert.strictEqual(pkg.main, 'src/main/bootstrap.js',
  'SafeLedger must preserve the trusted portable-storage bootstrap as its Electron entry.');
assert(read('package.json').includes('node scripts/hotfix-2.6.18-tests.js'),
  '2.6.18 trusted-bootstrap sizing coverage must stay in the locked suite.');

const bootstrap = read('src/main/bootstrap.js');
const windowSizing = read('src/main/window-sizing-main.js');
const rendererEntry = read('src/main/renderer-entry.js');

assert.strictEqual(fs.existsSync(path.join(root, 'src/main/startup.js')), false,
  'The temporary wrapper that bypassed the package bootstrap entry must stay removed.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/ui-scale-2.6.7.js')), false,
  'Renderer-owned startup sizing must stay removed.');
assert(!rendererEntry.includes("require('./ui-scale-2.6.7.js');"));
assert(bootstrap.includes("const { app, BrowserWindow, dialog, ipcMain: ipc, powerMonitor, shell, screen } = require('electron');"),
  'Trusted bootstrap must own Electron screen access for preferred sizing.');
assert(bootstrap.includes("const windowSizing = require('./window-sizing-main');"));
assert(bootstrap.includes('function installPreferredWindowSizing()'));
assert(bootstrap.includes("app.on('browser-window-created'"));
assert(bootstrap.includes('windowSizing.applyPreferredWindowSize(win, workArea);'));
assert(bootstrap.indexOf('if (startupStorageStatus.allowed)') < bootstrap.indexOf('installPreferredWindowSizing();'),
  'Preferred sizing must only be installed after portable-storage startup is approved.');
assert(bootstrap.indexOf('installPreferredWindowSizing();') < bootstrap.indexOf("require('./main');"),
  'Preferred sizing must be installed before main.js creates the primary BrowserWindow.');
assert(windowSizing.includes('const PREFERRED_WIDTH = '));
assert(windowSizing.includes('const PREFERRED_HEIGHT = 750;'));
assert(!windowSizing.includes('window.resizeTo'));
assert(!windowSizing.includes('DOMContentLoaded'));

console.log(`PASS SafeLedger ${pkg.version} preserves the portable-storage bootstrap boundary while owning startup window sizing in the main process.`);
