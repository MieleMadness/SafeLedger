'use strict';

const assert = require('assert');
const recoveryBinder = require('../src/main/recovery-binder');

const profile = {
  name: 'Estate',
  created: 'created-date',
  modified: 'modified-date',
  path: 'C:\\secret\\profile-path',
  notes: 'PROFILE-NOTES-SECRET'
};
const vaultData = {
  groups: [{
    name: 'Ledger',
    category: 'Hardware Wallet',
    manufacturer: 'Ledger',
    model: 'Nano X',
    recoveryFormat: 'BIP39',
    recoveryStorageMode: 'Stored externally',
    recoveryLocation: 'Home safe',
    deviceLocation: 'Office drawer',
    backupLocation: 'Bank box',
    passphraseUsed: 'Yes',
    beneficiary: 'Family',
    recoveryInstructions: 'Use the separately stored recovery material.',
    password: 'WALLET-PASSWORD-SECRET',
    pin: '123456',
    recoveryLink: 'RECOVERY-LINK-SECRET',
    seedPhrase: 'SEED-PHRASE-SECRET',
    notes: 'WALLET-NOTES-SECRET',
    customFields: [
      { label: 'Serial', type: 'text', value: 'SERIAL-123' },
      { label: 'Hidden code', type: 'sensitive', value: 'CUSTOM-SENSITIVE-SECRET' }
    ],
    records: [{
      name: 'Bitcoin',
      symbol: 'BTC',
      publicAddress: 'PUBLIC-ADDRESS-PRIVACY',
      privateAddress: 'PRIVATE-KEY-SECRET',
      manualBalance: '42 BTC',
      balanceUpdated: '2026-08-28T12:00:00.000Z',
      notes: 'COIN-NOTES-SECRET',
      customFields: [
        { label: 'Network', type: 'text', value: 'Mainnet' },
        { label: 'Secret memo', type: 'sensitive', value: 'ASSET-CUSTOM-SECRET' }
      ]
    }]
  }]
};

const safeBinder = recoveryBinder.buildBinder(profile, vaultData, {}, new Date('2026-08-28T12:30:00.000Z'));
const safeText = JSON.stringify(safeBinder);
for (const excluded of [
  profile.path,
  profile.notes,
  'WALLET-PASSWORD-SECRET',
  '123456',
  'RECOVERY-LINK-SECRET',
  'SEED-PHRASE-SECRET',
  'WALLET-NOTES-SECRET',
  'PUBLIC-ADDRESS-PRIVACY',
  'PRIVATE-KEY-SECRET',
  '42 BTC',
  'COIN-NOTES-SECRET',
  'CUSTOM-SENSITIVE-SECRET',
  'ASSET-CUSTOM-SECRET'
]) assert(!safeText.includes(excluded), `Safe-default binder leaked excluded value: ${excluded}`);

for (const expected of [
  'Estate',
  'Ledger',
  'Hardware Wallet',
  'Home safe',
  'Bank box',
  'Use the separately stored recovery material.',
  'Bitcoin',
  'BTC',
  'SERIAL-123',
  'Mainnet'
]) assert(safeText.includes(expected), `Safe-default binder omitted expected planning value: ${expected}`);

assert.deepStrictEqual(safeBinder.privacySelections, []);
assert.strictEqual(safeBinder.walletCount, 1);
assert.strictEqual(safeBinder.assetCount, 1);
assert(!JSON.stringify(safeBinder).includes('"qr":true'), 'Safe-default binder should not request QR output.');

const allOptions = Object.fromEntries(Object.keys(recoveryBinder.DEFAULT_OPTIONS).map((key) => [key, true]));
const fullBinder = recoveryBinder.buildBinder(profile, vaultData, allOptions, new Date('2026-08-28T12:30:00.000Z'));
const fullText = JSON.stringify(fullBinder);
for (const expected of [
  'PROFILE-NOTES-SECRET',
  'WALLET-PASSWORD-SECRET',
  '123456',
  'RECOVERY-LINK-SECRET',
  'SEED-PHRASE-SECRET',
  'WALLET-NOTES-SECRET',
  'PUBLIC-ADDRESS-PRIVACY',
  'PRIVATE-KEY-SECRET',
  '42 BTC',
  'COIN-NOTES-SECRET',
  'CUSTOM-SENSITIVE-SECRET',
  'ASSET-CUSTOM-SECRET'
]) assert(fullText.includes(expected), `Explicit binder option did not include expected value: ${expected}`);

assert.strictEqual(fullBinder.privacySelections.length, 6, 'QR output must not create a new privacy category; it mirrors already-selected values.');
const assetFields = fullBinder.wallets[0].assets[0].fields;
const publicAddress = assetFields.find((field) => field.label === 'Public address');
const privateKey = assetFields.find((field) => field.label === 'Private key');
assert(publicAddress && publicAddress.qr === true, 'Included public addresses should be marked for QR printing when requested.');
assert(privateKey && privateKey.qr === true, 'Included private keys should be marked for QR printing when requested.');
assert(!fullBinder.wallets[0].fields.some((field) => field.qr === true), 'Wallet fields without an in-app QR action must not gain QR output.');

const noQrBinder = recoveryBinder.buildBinder(profile, vaultData, Object.assign({}, allOptions, { includeQrCodes: false }), new Date('2026-08-28T12:30:00.000Z'));
assert(!JSON.stringify(noQrBinder).includes('"qr":true'), 'QR metadata must remain off unless the user checks Print available QR codes.');
assert.throws(() => recoveryBinder.buildBinder(profile, vaultData, {}, 'bad-date'));
console.log('PASS Recovery Binder excludes secrets by default, includes Profile notes only by opt-in, and prints QR metadata only for QR-capable selected fields.');
