'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lockPath = path.join(root, 'package-lock.json');
assert(fs.existsSync(lockPath), 'package-lock.json must be committed for reproducible builds');

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
assert.strictEqual(lock.lockfileVersion, 3);
assert(lock.packages && lock.packages[''], 'package-lock.json must contain root package metadata');

const lockedRoot = lock.packages[''];
for (const [name, version] of Object.entries(pkg.dependencies || {})) {
  assert.strictEqual(lockedRoot.dependencies[name], version, `locked dependency ${name} must match package.json`);
}
for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
  assert.strictEqual(lockedRoot.devDependencies[name], version, `locked devDependency ${name} must match package.json`);
}

assert.strictEqual(pkg.dependencies.jquery, undefined);
assert.strictEqual(lockedRoot.dependencies.jquery, undefined);
assert.strictEqual(lock.packages['node_modules/jquery'], undefined);

const installScriptPackages = Object.entries(lock.packages)
  .filter(([, metadata]) => metadata && metadata.hasInstallScript)
  .map(([name]) => name)
  .sort();

assert.deepStrictEqual(installScriptPackages, [
  'node_modules/electron-winstaller',
  'node_modules/esbuild'
]);

console.log('PASS committed dependency lock matches direct dependencies, excludes jQuery, and install-script packages match the reviewed build-time allowlist.');
