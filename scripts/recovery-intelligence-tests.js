'use strict';

const assert = require('assert');
const recoveryHealth = require('../src/main/recovery-health');
const addressValidator = require('../src/main/address-validator');
const { keccak256Hex } = require('../src/main/keccak256');

function byId(result, id) {
  return result.checks.find((item) => item.id === id);
}

function testRecoveryHealthIsExplainableAndSecretFree() {
  const now = Date.parse('2026-08-29T00:00:00.000Z');
  const secretSeed = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
  const secretPrivateKey = 'L1-super-secret-private-key-value';
  const secretLocation = 'Basement safe compartment 7';
  const wallet = {
    name: 'Cold Wallet',
    recoveryFormat: 'BIP39',
    recoveryStorageMode: 'Stored externally',
    recoveryLocation: secretLocation,
    recoveryInstructions: 'Use the offline recovery procedure.',
    seedPhrase: secretSeed,
    lastVerified: '2026-08-20T00:00:00.000Z',
    lastRecoveryDrill: '2026-08-21T00:00:00.000Z',
    records: [
      { name: 'Bitcoin', publicAddress: 'bc1q-example-public-address', privateAddress: secretPrivateKey },
      { name: 'Ethereum', publicAddress: '0x1111111111111111111111111111111111111111' }
    ]
  };
  const result = recoveryHealth.evaluateWallet(wallet, {
    now,
    backupHealth: {
      verified: { state: 'current', ageDays: 3 },
      verifiedBackupCreatedAt: '2026-08-25T00:00:00.000Z'
    }
  });

  assert.strictEqual(result.status, 'Ready');
  assert.strictEqual(result.score, 100);
  assert.strictEqual(byId(result, 'public-addresses').documentedCount, 2);
  assert.strictEqual(byId(result, 'public-addresses').assetCount, 2);
  const serialized = JSON.stringify(result);
  assert(!serialized.includes(secretSeed), 'Recovery Health must never return the seed phrase');
  assert(!serialized.includes(secretPrivateKey), 'Recovery Health must never return private keys');
  assert(!serialized.includes(secretLocation), 'Recovery Health must never return recovery locations');
  assert(!serialized.includes('bc1q-example-public-address'), 'Recovery Health must never return public-address values');
}

function testDeterministicDateBoundaries() {
  const now = Date.parse('2026-08-29T00:00:00.000Z');
  const exactly365 = new Date(now - (365 * recoveryHealth.DAY_MS)).toISOString();
  const day366 = new Date(now - (366 * recoveryHealth.DAY_MS)).toISOString();
  const base = {
    recoveryFormat: 'BIP39',
    recoveryLocation: 'Documented externally',
    recoveryInstructions: 'Recovery steps documented.',
    records: []
  };

  const current = recoveryHealth.evaluateWallet(Object.assign({}, base, {
    lastVerified: exactly365,
    lastRecoveryDrill: exactly365
  }), { now });
  assert.strictEqual(byId(current, 'verification').state, 'pass');
  assert.strictEqual(byId(current, 'recovery-drill').state, 'pass');

  const stale = recoveryHealth.evaluateWallet(Object.assign({}, base, {
    lastVerified: day366,
    lastRecoveryDrill: day366
  }), { now });
  assert.strictEqual(byId(stale, 'verification').state, 'review');
  assert.strictEqual(byId(stale, 'recovery-drill').state, 'review');
  assert.strictEqual(stale.status, 'Needs Review');
}

function testMissingMeansIncompleteNotUnsafe() {
  const result = recoveryHealth.evaluateWallet({}, { now: Date.parse('2026-08-29T00:00:00.000Z') });
  assert.strictEqual(result.status, 'Incomplete');
  assert(result.score >= 0 && result.score <= 100);
  assert(result.checks.some((item) => item.state === 'incomplete'));
  assert(!JSON.stringify(result).toLowerCase().includes('unsafe'));
}

function testAddressCoverageAndOptionalBackupContext() {
  const wallet = {
    recoveryFormat: 'BIP39',
    recoveryLocation: 'External',
    recoveryInstructions: 'Documented',
    lastVerified: '2026-08-28T00:00:00.000Z',
    lastRecoveryDrill: '2026-08-28T00:00:00.000Z',
    records: [
      { publicAddress: 'bc1q-one' },
      { publicAddress: '' }
    ]
  };
  const result = recoveryHealth.evaluateWallet(wallet, { now: Date.parse('2026-08-29T00:00:00.000Z') });
  const addresses = byId(result, 'public-addresses');
  const backup = byId(result, 'verified-backup');
  assert.strictEqual(addresses.state, 'review');
  assert.strictEqual(addresses.documentedCount, 1);
  assert.strictEqual(addresses.assetCount, 2);
  assert.strictEqual(backup.state, 'not-applicable');
  assert.strictEqual(backup.pointsPossible, 0);
}

function testVerifiedBackupAffectsScoreWithoutPaths() {
  const wallet = {
    recoveryFormat: 'BIP39',
    recoveryLocation: 'External',
    recoveryInstructions: 'Documented',
    lastVerified: '2026-08-28T00:00:00.000Z',
    lastRecoveryDrill: '2026-08-28T00:00:00.000Z'
  };
  const context = {
    now: Date.parse('2026-08-29T00:00:00.000Z'),
    backupHealth: {
      verified: { state: 'due', ageDays: 45, reminderDays: 30 },
      verifiedBackupCreatedAt: '2026-07-01T00:00:00.000Z',
      backupPath: 'X:/secret/location/SafeLedger.slgbak'
    }
  };
  const result = recoveryHealth.evaluateWallet(wallet, context);
  assert.strictEqual(byId(result, 'verified-backup').state, 'review');
  assert.strictEqual(result.status, 'Needs Review');
  assert(!JSON.stringify(result).includes('X:/secret/location'));
}

function testKeccakAndEip55() {
  assert.strictEqual(
    keccak256Hex(''),
    'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    'Keccak-256 must not be confused with SHA3-256'
  );
  const checked = addressValidator.validateEvm('0x52908400098527886E0F7030069857D2E4169EE7');
  assert.strictEqual(checked.status, 'valid');
  assert.strictEqual(checked.checksum, 'valid');
  assert.strictEqual(addressValidator.validateEvm('0xde709f2102306220921060314715629080e2fb77').status, 'valid');
  assert.strictEqual(addressValidator.validateEvm('0x52908400098527886E0F7030069857D2E4169Ee7').status, 'invalid');
}

function testBitcoinAddressValidation() {
  const base58 = addressValidator.validateBase58Check('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  assert.strictEqual(base58.status, 'valid');
  assert.strictEqual(base58.network, 'mainnet');
  assert.strictEqual(base58.addressType, 'p2pkh');
  assert.strictEqual(addressValidator.validateBase58Check('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb').status, 'invalid');

  const v0 = addressValidator.validateBitcoinSegwit('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4');
  assert.strictEqual(v0.status, 'valid');
  assert.strictEqual(v0.witnessVersion, 0);
  assert.strictEqual(v0.encoding, 'bech32');

  const v1 = addressValidator.validateBitcoinSegwit('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0');
  assert.strictEqual(v1.status, 'valid');
  assert.strictEqual(v1.witnessVersion, 1);
  assert.strictEqual(v1.encoding, 'bech32m');

  assert.strictEqual(addressValidator.validateBitcoinSegwit('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd').status, 'invalid');
  assert.strictEqual(addressValidator.validateAddress('not-a-supported-address').status, 'unsupported');
}

function testValidatorOutputsNeverEchoInput() {
  const sensitiveLooking = '0x52908400098527886E0F7030069857D2E4169EE7';
  const serialized = JSON.stringify(addressValidator.validateAddress(sensitiveLooking));
  assert(!serialized.includes(sensitiveLooking));
}

function run() {
  testRecoveryHealthIsExplainableAndSecretFree();
  testDeterministicDateBoundaries();
  testMissingMeansIncompleteNotUnsafe();
  testAddressCoverageAndOptionalBackupContext();
  testVerifiedBackupAffectsScoreWithoutPaths();
  testKeccakAndEip55();
  testBitcoinAddressValidation();
  testValidatorOutputsNeverEchoInput();
  console.log('PASS SafeLedger 2.4 Recovery Health and offline address validators are deterministic and secret-free.');
}

run();
