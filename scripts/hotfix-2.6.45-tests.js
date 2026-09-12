'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const gate2644 = read('scripts/hotfix-2.6.44-tests.js');
const gate251 = read('scripts/hotfix-2.5.1-tests.js');
const gate253 = read('scripts/hotfix-2.5.3-tests.js');

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 45,
  'SafeLedger 2.6.45 preload-wrapper correction must remain active on later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.45-tests.js'),
  '2.6.45 correction coverage must stay in the locked regression suite.');
assert(gate2644.startsWith("'use strict';"),
  'The 2.6.44 historical preload gate must be a valid strict-mode regression file.');
assert(gate2644.includes('parts[2] >= 44'),
  'The 2.6.44 historical preload corrections must remain active on later candidates.');
assert(gate251.includes("openDataFolder: () => invoke('device-open-data-folder')"),
  'Trusted-folder historical coverage must use the normalized preload wrapper.');
assert(gate253.includes("setSelfDestructProtection: (enabled) => invoke('set-self-destruct-protection', enabled === true)"),
  'Self-Destruct historical coverage must use the normalized preload wrapper.');

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.45 corrected preload-wrapper historical tests active.`);
