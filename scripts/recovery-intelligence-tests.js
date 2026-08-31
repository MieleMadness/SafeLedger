'use strict';

const assert = require('assert');
const recoveryHealth = require('../src/main/recovery-health');
const addressValidator = require('../src/main/address-validator');
const bip39 = require('../src/main/bip39-validator');
const recoveryDuplicates = require('../src/main/recovery-duplicates');
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

function testBip39WordlistAndChecksum() {
  assert.strictEqual(bip39.WORD_COUNT, 2048);
  assert.strictEqual(bip39._test.wordIndex('abandon'), 0);
  assert.strictEqual(bip39._test.wordIndex('dolphin'), 518);
  assert.strictEqual(bip39._test.wordIndex('domain'), 519);
  assert.strictEqual(bip39._test.wordIndex('limb'), 1038);
  assert.strictEqual(bip39._test.wordIndex('limit'), 1039);
  assert.strictEqual(bip39._test.wordIndex('security'), 1558);
  assert.strictEqual(bip39._test.wordIndex('seed'), 1559);
  assert.strictEqual(bip39._test.wordIndex('zoo'), 2047);

  const valid = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const invalidChecksum = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon ability';
  const unknownWord = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon notaword';
  assert.deepStrictEqual(bip39.validateMnemonic(valid), {
    supported: true, valid: true, wordCount: 12, wordsKnown: true, checksumValid: true, reason: 'valid'
  });
  assert.strictEqual(bip39.validateMnemonic(invalidChecksum).reason, 'checksum');
  assert.strictEqual(bip39.validateMnemonic(unknownWord).reason, 'unknown-word');
  assert.strictEqual(bip39.validateMnemonic('abandon ability').reason, 'word-count');
  assert(!JSON.stringify(bip39.validateMnemonic(valid)).includes('abandon'), 'BIP39 results must never echo mnemonic words');
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

function testPublicDuplicateDetectionIsValueFree() {
  const address = '0x52908400098527886E0F7030069857D2E4169EE7';
  const entries = [
    { profileName: 'Family', vaultData: { groups: [{ name: 'Cold', recoveryFormat: 'BIP39', records: [{ name: 'ETH', publicAddress: address }] }] } },
    { profileName: 'Estate', vaultData: { groups: [{ name: 'Cold', recoveryFormat: 'BIP39', records: [{ name: 'Ethereum', publicAddress: address.toLowerCase() }] }] } }
  ];
  const matches = recoveryDuplicates.publicAddressDuplicates(entries);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].count, 2);
  assert.strictEqual(matches[0].occurrences[0].profileName, 'Family');
  assert.strictEqual(matches[0].occurrences[1].profileName, 'Estate');
  const serialized = JSON.stringify(matches);
  assert(!serialized.toLowerCase().includes(address.toLowerCase().replace(/^0x/, '')), 'duplicate results must not return the public-address value');

  const metadataMatches = recoveryDuplicates.walletMetadataDuplicates(entries);
  assert.strictEqual(metadataMatches.length, 1);
  assert.strictEqual(metadataMatches[0].kind, 'wallet-method');
}

function testSensitiveFingerprintsAreSessionLocalAndSecretFree() {
  let keyGeneration = 0;
  const randomBytes = (size) => Buffer.alloc(size, ++keyGeneration);
  const session = new recoveryDuplicates.SensitiveFingerprintSession(randomBytes);
  const secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const sameNormalized = `  ${secret.toUpperCase()}  `;

  const first = session.fingerprint(secret);
  const same = session.fingerprint(sameNormalized);
  assert.strictEqual(first, same, 'same normalized secret must match only within the current session');
  assert.strictEqual(session.hasSessionKey(), true);

  const duplicateResults = session.findDuplicates([
    { profileName: 'Family', walletName: 'Cold', kind: 'seed', value: secret },
    { profileName: 'Estate', walletName: 'Backup', kind: 'seed', value: sameNormalized }
  ]);
  assert.strictEqual(duplicateResults.length, 1);
  assert.strictEqual(duplicateResults[0].count, 2);
  const serialized = JSON.stringify(duplicateResults);
  assert(!serialized.includes(secret));
  assert(!serialized.includes(first), 'session fingerprint itself must never be returned');

  session.clear();
  assert.strictEqual(session.hasSessionKey(), false, 'lock cleanup must discard the keyed fingerprint session');
  const nextSessionFingerprint = session.fingerprint(secret);
  assert.notStrictEqual(nextSessionFingerprint, first, 'the same secret must fingerprint differently after session-key rotation');
  session.clear();

  const separateSession = new recoveryDuplicates.SensitiveFingerprintSession(() => Buffer.alloc(32, 99));
  assert.notStrictEqual(separateSession.fingerprint(secret), first, 'deterministic reusable hashes are forbidden across sessions');
  separateSession.clear();
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
  testBip39WordlistAndChecksum();
  testKeccakAndEip55();
  testBitcoinAddressValidation();
  testPublicDuplicateDetectionIsValueFree();
  testSensitiveFingerprintsAreSessionLocalAndSecretFree();
  testValidatorOutputsNeverEchoInput();
  console.log('PASS SafeLedger 2.4 Recovery Health, BIP39, address validation, and privacy-preserving duplicate detection are deterministic and secret-free.');
}

run();
