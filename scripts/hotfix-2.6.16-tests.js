'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const baseline = JSON.parse(read('scripts/ui-visual-baseline.json'));
const uiCurrent = read('src/main/css/ui-current.css');
const index = read('src/main/index.html');

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 16,
  'SafeLedger 2.6.16 cleanup regressions must remain active on 2.6.16 and later 2.6.x candidates.');
assert(read('package.json').includes('node scripts/hotfix-2.6.16-tests.js'),
  '2.6.16 cleanup coverage must stay in the locked suite.');

const retiredHistoricalCss = [
  'src/main/css/ui-2.5.8.css',
  'src/main/css/ui-2.5.9.css',
  'src/main/css/ui-2.5.11.css',
  'src/main/css/ui-2.5.12.css',
  'src/main/css/ui-2.5.13.css',
  'src/main/css/ui-2.5.14.css',
  'src/main/css/ui-2.5.15.css',
  'src/main/css/ui-2.5.16.css',
  'src/main/css/ui-2.6.7-scale.css',
  'src/main/css/ui-2.6.7-theme-refinement.css'
];

for (const file of retiredHistoricalCss) {
  assert.strictEqual(fs.existsSync(path.join(root, file)), false,
    `${file} must remain deleted now that ui-current.css owns the consolidated cascade.`);
  assert(!index.includes(`./css/${path.basename(file)}`),
    `${file} must not return to the runtime stylesheet list.`);
}

function canonicalGitBlobSha(content) {
  const canonical = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const body = Buffer.from(canonical, 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

const lf = uiCurrent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const syntheticWindowsCheckout = lf.replace(/\n/g, '\r\n');
assert.strictEqual(canonicalGitBlobSha(lf), baseline.uiCurrentGitBlobSha,
  'LF checkout must match the approved consolidated UI baseline.');
assert.strictEqual(canonicalGitBlobSha(syntheticWindowsCheckout), baseline.uiCurrentGitBlobSha,
  'Synthetic Windows CRLF checkout must match the same approved consolidated UI baseline.');

const visualGate = read('scripts/visual-contract-regression-tests.js');
assert(visualGate.includes("replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n')"),
  'Visual baseline hashing must normalize platform line endings before comparison.');

const loginEyeGate = read('scripts/login-eye-regression-tests.js');
assert(loginEyeGate.includes("const currentUi = read('src/main/css/ui-current.css');"),
  'Login-eye coverage must read the canonical current stylesheet.');
for (const legacyName of ['ui-2.5.9.css', 'ui-2.5.11.css', 'ui-2.5.15.css', 'ui-2.5.16.css']) {
  assert(!loginEyeGate.includes(legacyName), `Login-eye regression must not depend on retired ${legacyName}.`);
}

assert(index.includes('<link href="./css/ui-current.css" rel="stylesheet">'));
assert(index.includes('<link href="./css/status-messages.css" rel="stylesheet">'));

console.log(`PASS SafeLedger ${pkg.version} keeps the 2.6.16 retired CSS cleanup and cross-platform visual baseline active.`);
