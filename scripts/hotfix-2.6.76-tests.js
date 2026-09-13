'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map(Number);
const serviceCatalog = require('../src/main/service-catalog');
const tokenIcons = require('../src/main/token-icons');

assert.strictEqual(parts[0], 2);
assert.strictEqual(parts[1], 6);
assert(parts[2] >= 76, 'The supplied Chain Games logo contract must remain active on later 2.6.x candidates.');
assert(pkg.scripts['test:regression'].includes('node scripts/hotfix-2.6.76-tests.js'));

const chainService = serviceCatalog.find('Chain Games');
assert(chainService && chainService.artwork === 'chain-games');
const lightSource = serviceCatalog.chainGamesAssetUrl('light');
const colorfulSource = serviceCatalog.chainGamesAssetUrl('colorful');
const darkSource = serviceCatalog.chainGamesAssetUrl('dark');
assert.strictEqual(lightSource, './assets/chain-games-light-colorful.svg');
assert.strictEqual(colorfulSource, lightSource);
assert.strictEqual(darkSource, './assets/chain-games-dark.svg');

const lightSvg = read('src/main/assets/chain-games-light-colorful.svg');
const darkSvg = read('src/main/assets/chain-games-dark.svg');
const suppliedLeftMark = 'M156,247.7l-92.9-76.9l92.2-115.4';
assert(lightSvg.includes(suppliedLeftMark) && darkSvg.includes(suppliedLeftMark),
  'Chain Games must use only the left icon from the project-owner supplied logo.');
assert(lightSvg.includes('<rect width="337" height="337" rx="72" fill="#000000"/>') && lightSvg.includes('fill="#FFFFFF"'),
  'Light and Colorful must use the requested black square with white logo.');
assert(darkSvg.includes('<rect width="337" height="337" rx="72" fill="#FFFFFF"/>') && darkSvg.includes('fill="#000000"'),
  'Dark must use the requested white square with black logo.');
assert(!lightSvg.includes('<text') && !darkSvg.includes('<text'), 'Chain Games must not include the wordmark or initials.');
assert(!lightSvg.includes('M164,4.5C73.4,4.5,0,77.9,0,168.5') && !darkSvg.includes('M164,4.5C73.4,4.5,0,77.9,0,168.5'),
  'The retired circular outer mark must not return.');

const chainToken = tokenIcons.getIconMatch({ name: 'Chain Games — Polygon', symbol: 'CHAIN' });
assert(chainToken && chainToken.key === 'CHAIN-GAMES');
assert.strictEqual(chainToken.src, lightSource,
  'Chain Games Vault Items and CHAIN Assets must continue sharing the same canonical artwork family.');

const historical = read('scripts/hotfix-2.6.4-tests.js');
assert(historical.includes(suppliedLeftMark),
  'The historical Chain Games regression must track the supplied left-only artwork.');

// Validate the historical regression by executing it. Do not infer assertion
// polarity by substring-searching its JavaScript source: the same text appears
// inside both positive and negated expressions, which caused the 2.6.76 CI
// false positive even though the historical test itself was passing.
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.4-tests.js')], { stdio: 'pipe' });
execFileSync(process.execPath, [path.join(root, 'scripts/hotfix-2.6.75-tests.js')], { stdio: 'pipe' });
for (const relative of [
  'src/main/service-catalog.js',
  'src/main/token-icons.js',
  'scripts/hotfix-2.6.4-tests.js',
  'scripts/hotfix-2.6.76-tests.js'
]) execFileSync(process.execPath, ['--check', path.join(root, relative)], { stdio: 'pipe' });

console.log(`PASS SafeLedger ${pkg.version} uses square theme-aware Chain Games artwork for both Vault Item and CHAIN Asset rendering.`);
