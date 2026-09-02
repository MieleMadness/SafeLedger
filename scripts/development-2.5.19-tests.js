'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2519 = version[0] > 2 ||
  (version[0] === 2 && version[1] > 5) ||
  (version[0] === 2 && version[1] === 5 && version[2] >= 19);
assert(atLeast2519, 'build must be SafeLedger 2.5.19 or later');

const readme = read('README.md');
for (const phrase of [
  'Profile → Vault Item → Asset',
  'Icon and preset catalog',
  'Standard starter wallets',
  'Wallet brand icons',
  'Exchange brand icons',
  'Asset and network icons',
  'Web3 / website account presets',
  'Coinbase Wallet',
  'Kraken Wallet',
  'MetaMask',
  'Bitcoin (`BTC`)',
  'Ethereum (`ETH`)',
  'FIO Protocol (`FIO`)'
]) assert(readme.includes(phrase), `README must document: ${phrase}`);

assert(
  readme.includes('Current development preview: SafeLedger 2.5.19') ||
  /Current stable release: SafeLedger 2\.6\.\d+/.test(readme),
  'README must identify the original 2.5.19 preview or a promoted 2.6.x stable release.'
);
assert(readme.includes('@web3icons/core` **4.0.55**'),
  'README must identify the pinned local icon dependency used by this feature set.');
assert(readme.includes('at least **1,000 token icons**'));
assert(readme.includes('at least **100 network icons**'));
assert(readme.includes('generic globe'),
  'README must document a local generic fallback for unknown Web3/website Vault Items.');

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.5.19+ Vault Item and local icon/preset documentation gates.`);
