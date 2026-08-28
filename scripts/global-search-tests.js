'use strict';

const assert = require('assert');
const globalSearch = require('../src/main/global-search');

const secrets = {
  password: 'PASSWORD-SECRET-XYZ',
  pin: 'PIN-884422',
  seed: 'SEED WORDS MUST NEVER BE SEARCHED',
  note: 'PRIVATE NOTE VALUE 12345',
  recoveryLocation: 'HIDDEN SAFE LOCATION',
  recoveryInstructions: 'CONFIDENTIAL RECOVERY INSTRUCTIONS',
  balance: '999999.123456',
  privateKey: 'PRIVATE-KEY-SEARCH-BLOCKED',
  customSecret: 'CUSTOM-SENSITIVE-SEARCH-BLOCKED'
};

const entries = [{
  profile: { name: 'Family Crypto', file: 'zvault-7.json', pinned: true },
  vaultData: {
    groups: [{
      name: 'Ledger Nano X',
      category: 'Hardware Wallet',
      manufacturer: 'Ledger',
      model: 'Nano X',
      recoveryFormat: 'BIP39',
      tags: 'cold storage, bitcoin',
      pinned: true,
      password: secrets.password,
      pin: secrets.pin,
      seedPhrase: secrets.seed,
      notes: secrets.note,
      recoveryLocation: secrets.recoveryLocation,
      recoveryInstructions: secrets.recoveryInstructions,
      customFields: [
        { label: 'Public nickname', type: 'text', value: 'Blue device' },
        { label: 'Hidden code', type: 'sensitive', value: secrets.customSecret }
      ],
      records: [{
        name: 'Bitcoin',
        symbol: 'BTC',
        publicAddress: 'bc1q-public-address',
        tags: 'long term',
        manualBalance: secrets.balance,
        privateAddress: secrets.privateKey,
        notes: secrets.note,
        pinned: true,
        customFields: [
          { label: 'Tax lot label', type: 'text', value: '2026 reserve' },
          { label: 'Secret memo', type: 'sensitive', value: secrets.customSecret }
        ]
      }]
    }]
  }
}];

const index = globalSearch.buildIndex(entries);
assert.strictEqual(index.length, 3);
const serializedIndex = JSON.stringify(index);
for (const value of Object.values(secrets)) {
  assert(!serializedIndex.includes(value), `secret leaked into global index: ${value}`);
  assert.deepStrictEqual(globalSearch.search(entries, value), []);
}

assert.strictEqual(globalSearch.search(entries, 'family')[0].type, 'profile');
assert.strictEqual(globalSearch.search(entries, 'ledger')[0].type, 'wallet');
assert.strictEqual(globalSearch.search(entries, 'nano x')[0].type, 'wallet');
assert.strictEqual(globalSearch.search(entries, 'bitcoin')[0].pinned, true);
assert.strictEqual(globalSearch.search(entries, 'btc')[0].type, 'asset');
assert.strictEqual(globalSearch.search(entries, 'bc1q-public-address')[0].type, 'asset');
assert.strictEqual(globalSearch.search(entries, 'blue device')[0].type, 'wallet');
assert.strictEqual(globalSearch.search(entries, '2026 reserve')[0].type, 'asset');
assert.deepStrictEqual(globalSearch.search(entries, 'x'), []);

for (const result of globalSearch.search(entries, 'ledger')) {
  assert(!Object.prototype.hasOwnProperty.call(result, 'searchText'));
  assert(!Object.prototype.hasOwnProperty.call(result, 'vaultData'));
}

console.log('PASS global search indexes only approved non-secret fields and returns sanitized navigation targets.');
