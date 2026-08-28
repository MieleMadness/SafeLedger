'use strict';

const crypto = require('crypto');
const { argon2id: wasmArgon2id } = require('hash-wasm');

const CURRENT_IMPLEMENTATION = 'hash-wasm-argon2id-v1';
const LEGACY_ASSOCIATED_DATA = Buffer.from('SafeLedger master password KDF v3', 'utf8');

function validateInputs(kdf) {
  if (!kdf || typeof kdf.salt !== 'string' || !/^[0-9a-f]{32}$/i.test(kdf.salt)) {
    throw new Error('SafeLedger Argon2 salt is invalid.');
  }
  if (!Number.isInteger(kdf.memory) || !Number.isInteger(kdf.passes) || !Number.isInteger(kdf.parallelism)) {
    throw new Error('SafeLedger Argon2 parameters are invalid.');
  }
}

async function deriveWasm(password, kdf) {
  validateInputs(kdf);
  const message = Buffer.from(String(password), 'utf8');
  try {
    const derived = await wasmArgon2id({
      password: message,
      salt: Buffer.from(kdf.salt, 'hex'),
      parallelism: kdf.parallelism,
      iterations: kdf.passes,
      memorySize: kdf.memory,
      hashLength: kdf.keyBytes || 32,
      outputType: 'binary'
    });
    const key = Buffer.from(derived);
    if (key.length !== (kdf.keyBytes || 32)) {
      key.fill(0);
      throw new Error('SafeLedger Argon2 returned an invalid key length.');
    }
    return key;
  } finally {
    message.fill(0);
  }
}

function deriveLegacyNative(password, kdf) {
  validateInputs(kdf);
  if (typeof crypto.argon2 !== 'function') {
    throw new Error('This legacy SafeLedger key envelope requires native Node.js Argon2 support.');
  }

  return new Promise((resolve, reject) => {
    const message = Buffer.from(String(password), 'utf8');
    crypto.argon2('argon2id', {
      message,
      nonce: Buffer.from(kdf.salt, 'hex'),
      parallelism: kdf.parallelism,
      tagLength: kdf.keyBytes || 32,
      memory: kdf.memory,
      passes: kdf.passes,
      associatedData: LEGACY_ASSOCIATED_DATA
    }, (err, derivedKey) => {
      message.fill(0);
      if (err) reject(err);
      else resolve(Buffer.from(derivedKey));
    });
  });
}

async function derive(password, kdf) {
  if (kdf && kdf.implementation === CURRENT_IMPLEMENTATION) {
    return deriveWasm(password, kdf);
  }

  // 2.0.27-2.0.32 test envelopes did not record an implementation and used
  // Node's native Argon2 API with associated data. Keep that format readable
  // anywhere the native implementation is available, while all new envelopes
  // use the Electron-safe WebAssembly implementation above.
  if (kdf && !kdf.implementation) {
    return deriveLegacyNative(password, kdf);
  }

  throw new Error('SafeLedger key envelope uses an unsupported Argon2 implementation.');
}

exports.CURRENT_IMPLEMENTATION = CURRENT_IMPLEMENTATION;
exports.derive = derive;
exports._test = { deriveWasm, deriveLegacyNative, validateInputs };
