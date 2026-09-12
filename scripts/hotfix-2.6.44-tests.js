'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const preload = read('src/main/preload.js');
const gate251 = read('scripts/hotfix-2.5.1-tests.js');
const gate253 = read('scripts/hotfix-2.5.3-tests.js');
const gate2643 = read('scripts/hotfix-2.6.43-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 44,
  'SafeLedger 2.6.44 historical preload corrections must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.44-tests.js'),
  '2.6.44 historical preload correction coverage must stay in the locked regression suite.');

assert(gate251.includes("openDataFolder: () => invoke('device-open-data-folder')"),
  'Trusted SafeLedgerData folder coverage must follow the normalized preload invoke boundary.');
assert(!gate251.includes("openDataFolder: () => ipcRenderer.invoke('device-open-data-folder')"),
  'Trusted folder regression must not require the retired direct preload source shape.');
assert(gate253.includes("setSelfDestructProtection: (enabled) => invoke('set-self-destruct-protection', enabled === true)"),
  'Self-Destruct settings coverage must follow the normalized preload invoke boundary.');
assert(!gate253.includes("setSelfDestructProtection: (enabled) => ipcRenderer.invoke('set-self-destruct-protection'"),
  'Self-Destruct regression must not require the retired direct preload source shape.');
assert(preload.includes("openDataFolder: () => invoke('device-open-data-folder')"));
assert(preload.includes("setSelfDestructProtection: (enabled) => invoke('set-self-destruct-protection', enabled === true)"));
assert(gate2643.includes('parts[2] >= 43'),
  'The 2.6.43 normalized preload roadmap correction must remain active.');

console.log(`PASS SafeLedger ${pkg.version} keeps trusted-folder and Self-Destruct historical tests aligned with the normalized preload boundary.`);
