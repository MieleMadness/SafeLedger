'use strict';

const { sha256Bytes } = require('./sha256');
const WORDLIST = Object.freeze([].concat(
  require('./bip39-wordlist-1'),
  require('./bip39-wordlist-2'),
  require('./bip39-wordlist-3'),
  require('./bip39-wordlist-4')
));
const ALLOWED_WORD_COUNTS = Object.freeze([12, 15, 18, 21, 24]);

if (WORDLIST.length !== 2048 || new Set(WORDLIST).size !== 2048) {
  throw new Error('SafeLedger BIP39 English wordlist integrity check failed.');
}

const WORD_INDEX = new Map(WORDLIST.map((word, index) => [word, index]));

function normalizeMnemonic(value) {
  return String(value || '')
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
}

function invalid(wordCount, reason, extra) {
  return Object.freeze(Object.assign({
    supported: true,
    valid: false,
    wordCount,
    wordsKnown: reason !== 'unknown-word',
    checksumValid: null,
    reason
  }, extra || {}));
}

function validateMnemonic(value) {
  const words = normalizeMnemonic(value);
  const wordCount = words.length;
  if (!ALLOWED_WORD_COUNTS.includes(wordCount)) return invalid(wordCount, 'word-count');

  const indices = [];
  for (const word of words) {
    const index = WORD_INDEX.get(word);
    if (index == null) return invalid(wordCount, 'unknown-word', { wordsKnown: false });
    indices.push(index);
  }

  const bitString = indices.map((index) => index.toString(2).padStart(11, '0')).join('');
  const checksumBits = wordCount / 3;
  const entropyBits = bitString.length - checksumBits;
  const entropy = new Uint8Array(entropyBits / 8);
  for (let offset = 0; offset < entropyBits; offset += 8) {
    entropy[offset / 8] = Number.parseInt(bitString.slice(offset, offset + 8), 2);
  }

  const suppliedChecksum = bitString.slice(entropyBits);
  const digest = sha256Bytes(entropy);
  const expectedChecksum = Array.from(digest)
    .map((byte) => byte.toString(2).padStart(8, '0'))
    .join('')
    .slice(0, checksumBits);
  const checksumValid = suppliedChecksum === expectedChecksum;
  entropy.fill(0);
  digest.fill(0);
  indices.fill(0);
  words.fill('');

  return Object.freeze({
    supported: true,
    valid: checksumValid,
    wordCount,
    wordsKnown: true,
    checksumValid,
    reason: checksumValid ? 'valid' : 'checksum'
  });
}

module.exports = {
  validateMnemonic,
  ALLOWED_WORD_COUNTS,
  WORD_COUNT: WORDLIST.length,
  _test: { normalizeMnemonic, wordIndex: (word) => WORD_INDEX.get(word) }
};
