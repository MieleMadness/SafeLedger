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

assert.strictEqual(pkg.version, '2.0.59');
assert(index.includes('./css/product-features.css'));
assert(group.includes("const recoveryReadiness = require('./recovery-readiness')"));
assert(group.includes("title.textContent = 'Recovery Readiness'"));
assert(group.includes("verify.innerHTML = '<i class=\"fa fa-check-circle\"></i> Verify now'"));
assert(group.includes('params.group.lastVerified = new Date().toISOString()'));
assert(css.includes('.recovery-readiness-card'));

for (const relative of ['src/main/recovery-readiness.js', 'src/main/group.js', 'scripts/recovery-readiness-tests.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });
}

assert(group.includes("const walletMetadata = require('./wallet-metadata')"));
assert(group.includes('walletMetadata.addEditFields'));
assert(group.includes('walletMetadata.appendDetail'));
assert(read('src/main/wallet-metadata.js').includes("label: 'Recovery material location'"));
assert(read('src/main/wallet-metadata.js').includes("label: 'Beneficiary / recovery contact'"));
console.log('PASS roadmap 2.0.59 adds optional wallet metadata and external recovery planning without requiring digital seed storage.');
