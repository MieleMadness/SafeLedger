'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const preload = read('src/main/preload.js');
const gate267 = read('scripts/hotfix-2.6.7-tests.js');
const gate2646 = read('scripts/hotfix-2.6.46-tests.js');

assert.strictEqual(pkg.version, '2.6.47', 'This workflow correction candidate must report SafeLedger 2.6.47.');
assert(read('package.json').includes('node scripts/hotfix-2.6.47-tests.js'),
  '2.6.47 app-menu preload correction coverage must stay in the locked regression suite.');
assert(preload.includes("prepareAppMenu: () => invoke('app-menu-prepare')"),
  'App-menu preparation must use the normalized renderer-facing invoke wrapper.');
assert(preload.includes("appMenuCommand: (command) => ipcRenderer.send('app-menu-command'"),
  'App-menu commands must remain fire-and-forget sends.');
assert(gate267.includes("prepareAppMenu: () => invoke('app-menu-prepare')"),
  'The historical 2.6.7 gate must validate the current normalized app-menu preload contract.');
assert(!gate267.includes("prepareAppMenu: () => ipcRenderer.invoke('app-menu-prepare')"),
  'The historical 2.6.7 gate must not require the retired direct app-menu invoke source shape.');
assert(gate2646.includes('parts[2] >= 46'),
  'The 2.6.46 Chain Games historical correction must remain active on later candidates.');

console.log('PASS SafeLedger 2.6.47 modernizes the 2.6.7 app-menu preload assertion without changing the 2.6.42 runtime feature set.');
