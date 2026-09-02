'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(parts[0] === 2 && parts[1] === 6 && parts[2] >= 5,
  'SafeLedger 2.6.5 release gates must apply to 2.6.5 and later 2.6.x patch releases.');

const readme = read('README.md');
assert(readme.includes('Current stable release: SafeLedger 2.6.5'),
  'README must identify SafeLedger 2.6.5 as the current stable release.');
assert(readme.includes('Profile → Vault Item → Asset'), 'README must preserve the 2.6 Vault Item hierarchy.');
assert(readme.includes('Windows x64 Portable EXE') && readme.includes('Linux x64 AppImage') && readme.includes('macOS Apple Silicon (`arm64`) ZIP'),
  'README must document all implemented 2.6.5 package targets.');
assert(readme.includes('Shit Coin Mode') && readme.includes('Chain Games'),
  'README must preserve the 2.6.2 asset-display and Chain Games additions.');
assert(readme.includes('Network') && readme.includes('Contract address'),
  'README must document multichain asset identity fields.');
assert(readme.includes('Facebook') && readme.includes('Yahoo'),
  'README must document the known website/password-account catalog.');
assert(readme.includes('not Developer ID signed or Apple-notarized'),
  'README must accurately disclose the current macOS signing/notarization state.');
assert(readme.includes('stuck in **processing**') && readme.includes('renderer-safe URI encoding'),
  'README must preserve the 2.6.3 Chain Games save hotfix documentation.');
assert(readme.includes('28px') && readme.includes('24px'),
  'README must preserve the 2.6.4 unified icon-size usability fix.');
assert(readme.includes('Web3 Account') && readme.includes('Website Account') && readme.includes('grouped and alphabetized'),
  'README must document the 2.6.5 account-type split and organized dropdowns.');
assert(readme.includes('selects the first visible Vault Item') && readme.includes('retries the real Add Asset button'),
  'README must document the 2.6.5 select-then-retry Add Asset repair.');

const release260 = read('RELEASE-2.6.md');
assert(release260.includes('Release: 2.6.0'), 'RELEASE-2.6.md must preserve the historical 2.6.0 release record.');
assert(release260.includes('Vault Item Experience & Local Web3 Catalog'));
assert(release260.includes('macOS Apple Silicon') && release260.includes('not represented as shipped support'),
  '2.6.0 release notes must not retroactively claim macOS support.');

const release261 = read('RELEASE-2.6.1.md');
assert(release261.includes('macOS Apple Silicon Foundation'));
assert(release261.includes('Apple Silicon (`arm64`) only'));
assert(release261.includes('does **not** claim Developer ID signing or Apple notarization'));

const release262 = read('RELEASE-2.6.2.md');
assert(release262.includes('Shit Coin Mode'));
assert(release262.includes('Chain Games'));
assert(release262.includes('known website'));

const release263 = read('RELEASE-2.6.3.md');
assert(release263.includes('Chain Games Save Hotfix'));
assert(release263.includes('Buffer'));
assert(release263.includes('processing'));
assert(release263.includes('Preset asset seeding is now isolated'));

const release264 = read('RELEASE-2.6.4.md');
assert(release264.includes('Add Asset & Icon Usability Hotfix'));
assert(release264.includes('first visible Vault Item'));
assert(release264.includes('28px') && release264.includes('24px'));
assert(release264.includes('dedicated local vector artwork') && release264.includes('local/offline artwork source'),
  '2.6.4 release notes must document dedicated Chain Games vector artwork that remains local/offline.');

const release265 = read('RELEASE-2.6.5.md');
assert(release265.includes('Account Types & Add Asset Reliability'));
assert(release265.includes('Web3 Account') && release265.includes('Website Account'));
assert(release265.includes('Grouped and alphabetized dropdowns'));
assert(release265.includes('Gaming') && release265.includes('Social & Community'));
assert(release265.includes('stops the first Add Asset click') && release265.includes('retries the real Add Asset button'));
assert(release265.includes('No vault schema migration'));

console.log(`PASS SafeLedger ${pkg.version} release documentation covers the 2.6.0 history through the 2.6.5 account-type/Add Asset reliability patch.`);