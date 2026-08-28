'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const pkg = JSON.parse(read('package.json'));
const group = read('src/main/group.js');
const index = read('src/main/index.html');
const css = read('src/main/css/product-features.css');
assert.strictEqual(pkg.version, '2.0.58');
assert(index.includes('./css/product-features.css'));
assert(group.includes("const recoveryReadiness = require('./recovery-readiness')"));
assert(group.includes("title.textContent = 'Recovery Readiness'"));
assert(group.includes("Verify now"));
assert(group.includes('params.group.lastVerified = new Date().toISOString()'));
assert(css.includes('.recovery-readiness-card'));
for (const relative of ['src/main/recovery-readiness.js', 'src/main/group.js', 'scripts/recovery-readiness-tests.js']) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
console.log('PASS roadmap 2.0.58 Recovery Readiness and Last Verified UI are wired directly into Wallet details.');
