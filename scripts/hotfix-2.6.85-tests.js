'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 87, 'The 2.6.85 click-order workaround is obsolete once focused-column artwork is removed.');
assert(!fs.existsSync(path.join(root, 'src/main/column-focus-artwork.js')),
  'The retired focus listener must not return merely to satisfy the historical click-order test.');

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.84-tests.js')], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} retires the obsolete 2.6.85 focus-listener click-order requirement.`);
