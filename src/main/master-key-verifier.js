'use strict';

const crypto = require('crypto');
const VERIFIER_CONTEXT = 'SafeLedger master key verifier v1';

exports.createMasterKeyVerifier = (cryptoKey) => {
  if (!cryptoKey) return '';
  return crypto.createHmac('sha256', cryptoKey).update(VERIFIER_CONTEXT).digest('hex');
};

exports.matchesMasterKeyVerifier = (cryptoKey, verifier) => {
  if (!cryptoKey || typeof verifier !== 'string' || !/^[0-9a-f]{64}$/i.test(verifier)) return false;
  const candidate = exports.createMasterKeyVerifier(cryptoKey);
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(verifier, 'hex'));
  } catch (_) {
    return false;
  }
};
