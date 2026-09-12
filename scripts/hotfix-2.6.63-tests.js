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
assert(versionParts[2] >= 63, 'The 2.6.63 icon-registry token-boundary correction must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/icon-registry-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.62-tests.js'));
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.63-tests.js'));

const registrySource = read('scripts/icon-registry-tests.js');
const priorGate = read('scripts/hotfix-2.6.62-tests.js');
const release = read('RELEASE-2.6.63.md');

assert(registrySource.includes('(?<![a-z0-9-])(?:fa|glyphicon)-'),
  'Icon scanning must require a real token boundary before an icon class.');
assert(registrySource.includes('(?![a-z0-9-])/gi'),
  'Icon scanning must require a real token boundary after an icon class.');
assert(registrySource.includes("const GENERATED_RUNTIME_ICONS = Object.freeze(['fa-chevron-left', 'fa-chevron-right']);"),
  'Generated collapse chevrons must remain covered explicitly.');
assert(priorGate.includes('versionParts[2] >= 62'));
assert(release.includes('false positives'));
assert(release.includes('fa-chevron'));
assert(release.includes('fa-f'));

const registry = require('./icon-registry-tests.js');
assert.deepStrictEqual(registry.extractIconTokens("icon.className = 'fa fa-mobile';"), ['fa-mobile']);
assert.deepStrictEqual(registry.extractIconTokens("icon.className = 'glyphicon glyphicon-save';"), ['glyphicon-save']);
assert.deepStrictEqual(registry.extractIconTokens("`fa fa-chevron-${state.collapsed ? 'right' : 'left'}`"), [],
  'Template prefixes must not be mistaken for complete icon classes.');
assert.deepStrictEqual(registry.extractIconTokens('/^[0-9a-fA-F]{40}$/'), [],
  'Hexadecimal character ranges must not be mistaken for fa-* classes.');
assert.deepStrictEqual(registry.findMissingIcons(), [], 'The corrected scanner must find no undefined runtime icons.');

execFileSync(process.execPath, [path.join(root, 'scripts/icon-registry-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/icon-registry-tests.js',
  'scripts/hotfix-2.6.62-tests.js',
  'scripts/hotfix-2.6.63-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps complete icon coverage while rejecting non-icon/template-prefix false positives.`);
