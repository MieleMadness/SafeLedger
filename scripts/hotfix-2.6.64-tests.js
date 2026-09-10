'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const versionParts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(versionParts[0], 2);
assert.strictEqual(versionParts[1], 6);
assert(versionParts[2] >= 64, 'The 2.6.64 cross-platform icon-registry newline contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/icon-registry-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.63-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.64-tests.js'));

const registrySource = read('scripts/icon-registry-tests.js');
const priorGate = read('scripts/hotfix-2.6.63-tests.js');
const release = read('RELEASE-2.6.64.md');

assert(registrySource.includes("function normalizeNewlines(value)"));
assert(registrySource.includes("replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n')"),
  'The icon registry must normalize CRLF/LF before exact fallback-contract checks.');
assert(priorGate.includes('versionParts[2] >= 63'));
assert(release.includes('Windows'));
assert(release.includes('CRLF'));

const registry = require('./icon-registry-tests.js');
const fallbackLf = '.fa::before,\n.glyphicon::before { content: "•"; }';
const fallbackCrlf = '.fa::before,\r\n.glyphicon::before { content: "•"; }';
assert.strictEqual(registry.normalizeNewlines(fallbackCrlf), fallbackLf,
  'Windows CRLF source must normalize to the same fallback contract used on Linux/macOS.');
assert.deepStrictEqual(registry.findMissingIcons(), [], 'Cross-platform normalization must not change icon coverage results.');

execFileSync(process.execPath, [path.join(root, 'scripts/icon-registry-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/icon-registry-tests.js',
  'scripts/hotfix-2.6.63-tests.js',
  'scripts/hotfix-2.6.64-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps the complete icon registry gate stable across Windows CRLF and Unix LF checkouts.`);
