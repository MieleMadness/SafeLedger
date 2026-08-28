'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const securityMain = require('../src/main/security-main');
const main = read('src/main/main.js');
const preload = read('src/main/preload.js');
const bundle = read('src/main/renderer.bundle.js');

assert(main.includes('sandbox: true'));
assert(main.includes('nodeIntegration: false'));
assert(main.includes('contextIsolation: true'));
assert(!preload.includes("require('./"));
assert(preload.includes("contextBridge.exposeInMainWorld('safeLedgerApi'"));
for (const forbidden of [
  "require('electron')", 'require("electron")',
  "require('fs')", 'require("fs")',
  "require('path')", 'require("path")',
  "require('crypto')", 'require("crypto")',
  'node:fs', 'node:path', 'node:crypto'
]) assert(!bundle.includes(forbidden), `renderer bundle must not contain ${forbidden}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-security-main-'));
try {
  const rootDir = path.join(temp, 'SafeLedgerData');
  fs.mkdirSync(path.join(rootDir, 'vaults'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'vaults', 'vaultlist.json'), 'encrypted');
  assert.throws(() => securityMain._test.safeBackupPath(rootDir, '../escape'));
  assert.strictEqual(securityMain._test.validateBackupPayload({
    format: 'safeledger-complete-data-backup',
    version: 2,
    files: { 'vaults/vaultlist.json': Buffer.from('x').toString('base64') }
  }).version, 2);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('PASS sandbox bundle has no privileged runtime imports and backup paths reject traversal.');
