'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const preload = read('src/main/preload.js');
const renderer = read('src/main/renderer.js');
const gate267 = read('scripts/hotfix-2.6.7-tests.js');
const gate2646 = read('scripts/hotfix-2.6.46-tests.js');

assert.strictEqual(pkg.version, '2.6.47', 'This requested-update workflow candidate must report SafeLedger 2.6.47.');
assert(read('package.json').includes('node scripts/hotfix-2.6.47-tests.js'),
  '2.6.47 coverage must stay in the locked regression suite.');
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

const passwordMessages = [
  'Must be at least 8 characters long.',
  'Must contain at least one uppercase letter.',
  'Must contain one lowercase letter.',
  'Must contain at least one number'
];
for (const message of passwordMessages) {
  assert(renderer.includes(`'${message}'`), `Login password guidance must include: ${message}`);
}
assert(renderer.indexOf(passwordMessages[0]) < renderer.indexOf(passwordMessages[1]) &&
  renderer.indexOf(passwordMessages[1]) < renderer.indexOf(passwordMessages[2]) &&
  renderer.indexOf(passwordMessages[2]) < renderer.indexOf(passwordMessages[3]),
  'Login password guidance must keep the requested length, uppercase, lowercase, number order.');
assert(!renderer.includes('Must contain at least one number and one lowercase letter.'),
  'The retired combined number/lowercase guidance line must stay removed.');

console.log('PASS SafeLedger 2.6.47 keeps the normalized app-menu preload boundary and uses the requested four-line login password guidance.');
