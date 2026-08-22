'use strict';

const crypto = require('crypto');
const argon2Provider = require('./argon2-provider');

const CRYPTO_VERSION = 3;
const KDF_ALGORITHM = 'argon2id';
const KDF_MEMORY_KIB = 65536;
const KDF_PASSES = 3;
const KDF_PARALLELISM = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const WRAP_IV_BYTES = 12;
const WRAP_TAG_BYTES = 16;
const WRAP_AAD = Buffer.from('SafeLedger DEK envelope v3', 'utf8');
const VERIFIER_CONTEXT = 'SafeLedger Argon2 KEK verifier v3';

function argon2id(password, kdf) {
  return argon2Provider.derive(password, kdf);
}

function defaultKdf() {
  return {
    algorithm: KDF_ALGORITHM,
    implementation: argon2Provider.CURRENT_IMPLEMENTATION,
    salt: crypto.randomBytes(SALT_BYTES).toString('hex'),
    memory: KDF_MEMORY_KIB,
    passes: KDF_PASSES,
    parallelism: KDF_PARALLELISM,
    keyBytes: KEY_BYTES
  };
}

function validateKdf(kdf) {
  return !!kdf
    && kdf.algorithm === KDF_ALGORITHM
    && (!kdf.implementation || kdf.implementation === argon2Provider.CURRENT_IMPLEMENTATION)
    && typeof kdf.salt === 'string'
    && /^[0-9a-f]{32}$/i.test(kdf.salt)
    && Number.isInteger(kdf.memory) && kdf.memory >= 8192 && kdf.memory <= 262144
    && Number.isInteger(kdf.passes) && kdf.passes >= 1 && kdf.passes <= 10
    && Number.isInteger(kdf.parallelism) && kdf.parallelism >= 1 && kdf.parallelism <= 16
    && kdf.keyBytes === KEY_BYTES;
}

function verifierForKek(kek) {
  return crypto.createHmac('sha256', kek).update(VERIFIER_CONTEXT).digest('hex');
}

function wrapDataKey(kek, dataKey) {
  const iv = crypto.randomBytes(WRAP_IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv, { authTagLength: WRAP_TAG_BYTES });
  cipher.setAAD(WRAP_AAD);
  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: ciphertext.toString('hex')
  };
}

function validateWrappedKey(wrappedKey) {
  return !!wrappedKey
    && wrappedKey.algorithm === 'aes-256-gcm'
    && typeof wrappedKey.iv === 'string' && /^[0-9a-f]{24}$/i.test(wrappedKey.iv)
    && typeof wrappedKey.tag === 'string' && /^[0-9a-f]{32}$/i.test(wrappedKey.tag)
    && typeof wrappedKey.ciphertext === 'string' && /^[0-9a-f]{64}$/i.test(wrappedKey.ciphertext);
}

function unwrapDataKeyWithKek(kek, wrappedKey) {
  if (!validateWrappedKey(wrappedKey)) throw new Error('SafeLedger key envelope is damaged.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    kek,
    Buffer.from(wrappedKey.iv, 'hex'),
    { authTagLength: WRAP_TAG_BYTES }
  );
  decipher.setAAD(WRAP_AAD);
  decipher.setAuthTag(Buffer.from(wrappedKey.tag, 'hex'));
  const dataKey = Buffer.concat([
    decipher.update(Buffer.from(wrappedKey.ciphertext, 'hex')),
    decipher.final()
  ]);
  if (dataKey.length !== KEY_BYTES) throw new Error('SafeLedger data key has an invalid length.');
  return dataKey;
}

function validateEnvelope(envelope) {
  return !!envelope
    && envelope.format === 'safeledger-key-envelope'
    && envelope.version === CRYPTO_VERSION
    && validateKdf(envelope.kdf)
    && validateWrappedKey(envelope.wrappedKey)
    && typeof envelope.kekVerifier === 'string'
    && /^[0-9a-f]{64}$/i.test(envelope.kekVerifier)
    && (!envelope.migration || envelope.migration.status === 'pending');
}

async function createEnvelope(password, dataKey = crypto.randomBytes(KEY_BYTES), migration = null) {
  const kdf = defaultKdf();
  const kek = await argon2id(password, kdf);
  const envelope = {
    format: 'safeledger-key-envelope',
    version: CRYPTO_VERSION,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    kdf,
    kekVerifier: verifierForKek(kek),
    wrappedKey: wrapDataKey(kek, dataKey)
  };
  if (migration) envelope.migration = migration;
  kek.fill(0);
  return { envelope, dataKey: Buffer.from(dataKey) };
}

async function unlockEnvelope(password, envelope) {
  if (!validateEnvelope(envelope)) {
    return { ok: false, type: 'envelope-corrupt', message: 'SafeLedger key envelope is damaged or unsupported.' };
  }
  let kek;
  try {
    kek = await argon2id(password, envelope.kdf);
  } catch (err) {
    return { ok: false, type: 'kdf-error', message: err.message || 'Unable to derive SafeLedger password key.' };
  }

  const candidateVerifier = verifierForKek(kek);
  const verifierMatches = crypto.timingSafeEqual(
    Buffer.from(candidateVerifier, 'hex'),
    Buffer.from(envelope.kekVerifier, 'hex')
  );
  if (!verifierMatches) {
    kek.fill(0);
    return { ok: false, type: 'password-failed', message: 'Invalid Password' };
  }

  try {
    const dataKey = unwrapDataKeyWithKek(kek, envelope.wrappedKey);
    kek.fill(0);
    return { ok: true, dataKey };
  } catch (_) {
    kek.fill(0);
    return {
      ok: false,
      type: 'envelope-corrupt',
      message: 'The SafeLedger key envelope failed authentication. Your failed-login counter was not changed.'
    };
  }
}

async function rewrapEnvelope(oldPassword, newPassword, envelope) {
  if (envelope && envelope.migration) {
    return {
      ok: false,
      type: 'migration-pending',
      message: 'SafeLedger is finishing its encryption upgrade. Please wait for the upgrade to complete before changing the password.'
    };
  }
  const unlocked = await unlockEnvelope(oldPassword, envelope);
  if (!unlocked.ok) return unlocked;
  const created = await createEnvelope(newPassword, unlocked.dataKey);
  unlocked.dataKey.fill(0);
  created.envelope.created = envelope.created || created.envelope.created;
  return { ok: true, envelope: created.envelope, dataKey: created.dataKey };
}

function deriveLegacyKey(password) {
  const value = String(password);
  return crypto.createHmac('sha256', value.split('').reverse().join('')).update(value).digest();
}

exports.CRYPTO_VERSION = CRYPTO_VERSION;
exports.KEY_BYTES = KEY_BYTES;
exports.KDF_IMPLEMENTATION = argon2Provider.CURRENT_IMPLEMENTATION;
exports.defaultKdf = defaultKdf;
exports.validateEnvelope = validateEnvelope;
exports.createEnvelope = createEnvelope;
exports.unlockEnvelope = unlockEnvelope;
exports.rewrapEnvelope = rewrapEnvelope;
exports.deriveLegacyKey = deriveLegacyKey;
exports._test = { argon2id, verifierForKek, wrapDataKey, unwrapDataKeyWithKek, validateKdf, validateWrappedKey };
