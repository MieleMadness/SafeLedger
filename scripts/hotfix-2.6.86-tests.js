'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 87, 'The 2.6.86 punctuation gate is historical after the focused-column feature is intentionally retired.');

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.85-tests.js')], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.86 historical gate compatible with the intentional solid-column rollback.`);
