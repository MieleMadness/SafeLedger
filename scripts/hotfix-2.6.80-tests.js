'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 80, 'The malformed-login-artwork repair must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.80-tests.js'),
  'The 2.6.80 login-artwork repair must remain in the main regression chain.');

const palette = read('src/main/css/appearance-palettes.css');
assert(palette.includes('login-background-light.svg') && palette.includes('login-background-dark.svg'),
  'The active palette must use the repaired local SVG login artwork.');
assert(!palette.includes('login-background-light.jpg') && !palette.includes('login-background-dark.jpg'),
  'The malformed JPEG login artwork must stay retired.');

for (const relative of [
  'src/main/assets/login-background-light.svg',
  'src/main/assets/login-background-dark.svg'
]) {
  const svg = read(relative);
  assert(svg.startsWith('<svg '), `${relative} must be valid text SVG artwork.`);
  assert(svg.includes('width="1280"') && svg.includes('height="720"') && svg.includes('viewBox="0 0 1280 720"'),
    `${relative} must preserve the intended 1280x720 16:9 composition.`);
  assert(!/<script\b/i.test(svg), `${relative} must not contain executable script.`);
  assert(!/<foreignObject\b/i.test(svg), `${relative} must not embed HTML.`);
  assert(!/<image\b/i.test(svg), `${relative} must not depend on nested raster artwork.`);
  assert(!/\bhref\s*=\s*["']https?:/i.test(svg), `${relative} must not reference remote resources.`);
}

for (const retired of [
  'src/main/assets/login-background-light.jpg',
  'src/main/assets/login-background-dark.jpg'
]) {
  assert(!fs.existsSync(path.join(root, retired)), `${retired} must stay removed after the malformed binary asset repair.`);
}

const gate78 = read('scripts/hotfix-2.6.78-tests.js');
const gate79 = read('scripts/hotfix-2.6.79-tests.js');
assert(!gate78.includes('function jpegDimensions(data)'),
  'The stale JPEG-specific parser must stay removed from the historical login-artwork gate.');
assert(gate78.includes('login-background-light.svg') && gate78.includes('must not reference remote content'),
  'The historical 2.6.78 gate must validate the current local SVG implementation.');
assert(gate79.includes('historical JPEG parser must stay retired'),
  'The 2.6.79 gate must document and protect the current asset format.');

const release = read('RELEASE-2.6.80.md').toLowerCase();
for (const phrase of [
  'first byte was `0xfe` instead of `0xff`',
  'malformed binary jpeg assets are removed completely',
  'self-contained svg',
  'text-based',
  'no scripts',
  'fully local/offline',
  'no encryption'
]) {
  assert(release.includes(phrase), `2.6.80 release notes must mention: ${phrase}`);
}

execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.79-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'scripts/hotfix-2.6.78-tests.js',
  'scripts/hotfix-2.6.79-tests.js',
  'scripts/hotfix-2.6.80-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} replaces malformed binary login artwork with self-contained local SVG assets.`);
