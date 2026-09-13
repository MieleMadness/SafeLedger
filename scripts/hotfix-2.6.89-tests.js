'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.deepStrictEqual(parts.slice(0, 2), [2, 6]);
assert(parts[2] >= 89, 'The 2.6.89 historical local-artwork regression repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.89-tests.js'),
  'The 2.6.89 regression repair must remain in the main regression chain.');

const historical = read('scripts/development-2.6.2-tests.js');
assert(historical.includes("const chainArtwork = serviceCatalog.iconDataUrl(chainService);"),
  'The historical 2.6.2 gate must validate Chain Games artwork separately from generated service data URLs.');
assert(historical.includes("chainArtwork.startsWith('./assets/chain-games-')"),
  'Chain Games must be accepted only from the bundled local assets family.');
assert(historical.includes("!/^https?:\\/\\//i.test(chainArtwork)"),
  'The historical regression must explicitly reject network Chain Games artwork.');
assert(historical.includes("fs.existsSync(path.join(root, 'src/main', chainArtwork.replace(/^\\.\\//, '')))"),
  'The historical regression must verify that the referenced Chain Games SVG actually exists in packaged source assets.');
assert(!historical.includes("['Chain Games','Facebook','Yahoo'"),
  'The stale blanket data-URL assertion must not be reintroduced for Chain Games.');

const release = read('RELEASE-2.6.89.md').toLowerCase();
for (const phrase of [
  'all three platform workflows',
  'development-2.6.2-tests.js',
  'root cause',
  'stale historical test assumption',
  'fully local/offline',
  'no production application'
]) {
  assert(release.includes(phrase.toLowerCase()), `2.6.89 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/development-2.6.2-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.88-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/development-2.6.2-tests.js',
  'scripts/hotfix-2.6.88-tests.js',
  'scripts/hotfix-2.6.89-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} keeps Chain Games fully local while allowing its theme-aware packaged SVG artwork.`);
