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
const chainUrl = serviceCatalog.iconDataUrl(chainService);
assert(chainUrl && chainUrl.startsWith('data:image/svg+xml;charset=utf-8,'),
  'Chain Games artwork must stay bundled locally as an SVG data URL.');
const chainSvg = decodeURIComponent(chainUrl.slice(chainUrl.indexOf(',') + 1));
const suppliedMark = 'M164,4.5C73.4,4.5,0,77.9,0,168.5';
assert(chainSvg.includes(suppliedMark),
  'Chain Games must use the circular mark from the project-owner supplied SVG.');
assert(chainSvg.includes('fill="#FFFFFF"'),
  'The supplied Chain Games mark must retain its white artwork.');
assert(chainSvg.includes('fill="#0b1030"'),
  'The white Chain Games mark must keep a local dark backing for cross-theme visibility.');
assert(!chainSvg.includes('chain-games-gradient') && !chainSvg.includes('<linearGradient'),
  'The retired SafeLedger-drawn gradient approximation must not return.');
assert(!chainSvg.includes('<text'),
  'Chain Games must not fall back to an initials tile.');

const chainToken = tokenIcons.getIconMatch({ name: 'Chain Games — Polygon', symbol: 'CHAIN' });
assert(chainToken && chainToken.key === 'CHAIN-GAMES');
assert.strictEqual(chainToken.src, chainUrl,
  'Chain Games Vault Items and CHAIN Assets must continue sharing the same canonical logo source.');

const historical = read('scripts/hotfix-2.6.4-tests.js');
assert(historical.includes(suppliedMark),
  'The historical Chain Games regression must track the supplied artwork rather than the retired approximation.');

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

console.log(`PASS SafeLedger ${pkg.version} uses the supplied Chain Games circular mark for both Vault Item and CHAIN Asset artwork.`);
