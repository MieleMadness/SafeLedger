'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
assert(version[0] === 2 && version[1] === 5 && version[2] >= 19,
  'development build must be SafeLedger 2.5.19 or later');

const readme = read('README.md');
for (const phrase of [
  'Current development preview: SafeLedger 2.5.19',
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

assert(readme.includes('@web3icons/core` **4.0.55**'),
  'README must identify the pinned local icon dependency used by this development build.');
assert(readme.includes('at least **1,000 token icons**'));
assert(readme.includes('at least **100 network icons**'));
assert(readme.includes('generic local service icon'));

console.log('PASS SafeLedger 2.5.19 README documents current Vault Item features and local icon/preset coverage.');
