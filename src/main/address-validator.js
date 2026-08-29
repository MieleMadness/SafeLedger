'use strict';

const crypto = require('crypto');
const { keccak256Hex } = require('./keccak256');

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Map(Array.from(BASE58_ALPHABET).map((char, index) => [char, index]));
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_MAP = new Map(Array.from(BECH32_CHARSET).map((char, index) => [char, index]));
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function result(status, family, extra) {
  return Object.freeze(Object.assign({ status, family }, extra || {}));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function decodeBase58(value) {
  const text = String(value || '');
  if (!text || Array.from(text).some((char) => !BASE58_MAP.has(char))) return null;
  let number = 0n;
  for (const char of text) number = (number * 58n) + BigInt(BASE58_MAP.get(char));
  let hex = number.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  let body = hex === '00' || !hex ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
  let leading = 0;
  while (leading < text.length && text[leading] === '1') leading++;
  if (leading) body = Buffer.concat([Buffer.alloc(leading), body]);
  return body;
}

function validateBase58Check(value) {
  const decoded = decodeBase58(String(value || '').trim());
  if (!decoded || decoded.length !== 25) return result('invalid', 'bitcoin-base58', { reason: 'format' });
  const payload = decoded.subarray(0, 21);
  const checksum = decoded.subarray(21);
  const first = sha256(payload);
  const second = sha256(first);
  const expected = second.subarray(0, 4);
  const checksumValid = crypto.timingSafeEqual(checksum, expected);
  first.fill(0);
  second.fill(0);
  if (!checksumValid) return result('invalid', 'bitcoin-base58', { reason: 'checksum' });

  const version = payload[0];
  const versionInfo = {
    0x00: ['mainnet', 'p2pkh'],
    0x05: ['mainnet', 'p2sh'],
    0x6f: ['testnet', 'p2pkh'],
    0xc4: ['testnet', 'p2sh']
  }[version];
  if (!versionInfo) return result('unsupported', 'bitcoin-base58', { reason: 'version' });
  return result('valid', 'bitcoin-base58', { network: versionInfo[0], addressType: versionInfo[1], checksum: 'valid' });
}

function bech32Polymod(values) {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= generators[i];
  }
  return chk >>> 0;
}

function bech32HrpExpand(hrp) {
  const values = [];
  for (const char of hrp) values.push(char.charCodeAt(0) >>> 5);
  values.push(0);
  for (const char of hrp) values.push(char.charCodeAt(0) & 31);
  return values;
}

function convertBits(data, fromBits, toBits, pad) {
  let accumulator = 0;
  let bits = 0;
  const output = [];
  const maxValue = (1 << toBits) - 1;
  const maxAccumulator = (1 << (fromBits + toBits - 1)) - 1;
  for (const value of data) {
    if (value < 0 || (value >>> fromBits) !== 0) return null;
    accumulator = ((accumulator << fromBits) | value) & maxAccumulator;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      output.push((accumulator >>> bits) & maxValue);
    }
  }
  if (pad) {
    if (bits) output.push((accumulator << (toBits - bits)) & maxValue);
  } else if (bits >= fromBits || ((accumulator << (toBits - bits)) & maxValue)) {
    return null;
  }
  return output;
}

function decodeBech32(value) {
  const original = String(value || '').trim();
  if (!original || original.length > 90) return null;
  const hasLower = original !== original.toUpperCase();
  const hasUpper = original !== original.toLowerCase();
  if (hasLower && hasUpper) return null;
  const text = original.toLowerCase();
  const separator = text.lastIndexOf('1');
  if (separator < 1 || separator + 7 > text.length) return null;
  const hrp = text.slice(0, separator);
  const chars = text.slice(separator + 1);
  const data = [];
  for (const char of chars) {
    if (!BECH32_MAP.has(char)) return null;
    data.push(BECH32_MAP.get(char));
  }
  const polymod = bech32Polymod(bech32HrpExpand(hrp).concat(data));
  const encoding = polymod === BECH32_CONST ? 'bech32' : polymod === BECH32M_CONST ? 'bech32m' : null;
  if (!encoding) return null;
  return { hrp, data: data.slice(0, -6), encoding };
}

function validateBitcoinSegwit(value) {
  const decoded = decodeBech32(value);
  if (!decoded || !['bc', 'tb', 'bcrt'].includes(decoded.hrp) || decoded.data.length < 1) {
    return result('invalid', 'bitcoin-segwit', { reason: 'format' });
  }
  const witnessVersion = decoded.data[0];
  if (witnessVersion < 0 || witnessVersion > 16) return result('invalid', 'bitcoin-segwit', { reason: 'witness-version' });
  const program = convertBits(decoded.data.slice(1), 5, 8, false);
  if (!program || program.length < 2 || program.length > 40) return result('invalid', 'bitcoin-segwit', { reason: 'witness-program' });
  if (witnessVersion === 0 && ![20, 32].includes(program.length)) return result('invalid', 'bitcoin-segwit', { reason: 'witness-program' });
  if (witnessVersion === 0 && decoded.encoding !== 'bech32') return result('invalid', 'bitcoin-segwit', { reason: 'encoding' });
  if (witnessVersion > 0 && decoded.encoding !== 'bech32m') return result('invalid', 'bitcoin-segwit', { reason: 'encoding' });
  const network = decoded.hrp === 'bc' ? 'mainnet' : decoded.hrp === 'tb' ? 'testnet' : 'regtest';
  return result('valid', 'bitcoin-segwit', {
    network,
    witnessVersion,
    witnessProgramBytes: program.length,
    encoding: decoded.encoding,
    checksum: 'valid'
  });
}

function validateEvm(value) {
  const input = String(value || '').trim();
  const raw = input.startsWith('0x') || input.startsWith('0X') ? input.slice(2) : input;
  if (!/^[0-9a-fA-F]{40}$/.test(raw)) return result('invalid', 'evm', { reason: 'format' });
  if (raw === raw.toLowerCase() || raw === raw.toUpperCase()) {
    return result('valid', 'evm', { checksum: 'not-applied' });
  }
  const lower = raw.toLowerCase();
  const hash = keccak256Hex(lower);
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (!/[a-fA-F]/.test(char)) continue;
    const shouldUpper = Number.parseInt(hash[i], 16) >= 8;
    if (shouldUpper !== (char === char.toUpperCase())) return result('invalid', 'evm', { reason: 'checksum', checksum: 'invalid' });
  }
  return result('valid', 'evm', { checksum: 'valid' });
}

function detectFamily(value) {
  const text = String(value || '').trim();
  if (/^(0x)?[0-9a-fA-F]{40}$/.test(text)) return 'evm';
  if (/^(bc1|tb1|bcrt1)/i.test(text)) return 'bitcoin-segwit';
  if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26,62}$/.test(text)) return 'bitcoin-base58';
  return null;
}

function validateAddress(value, family = 'auto') {
  const selected = family === 'auto' ? detectFamily(value) : String(family || '').trim().toLowerCase();
  if (selected === 'evm' || selected === 'ethereum') return validateEvm(value);
  if (selected === 'bitcoin-base58' || selected === 'btc-base58') return validateBase58Check(value);
  if (selected === 'bitcoin-segwit' || selected === 'btc-segwit' || selected === 'bech32') return validateBitcoinSegwit(value);
  return result('unsupported', selected || 'unknown', { reason: 'unsupported-family' });
}

module.exports = {
  validateAddress,
  validateBase58Check,
  validateBitcoinSegwit,
  validateEvm,
  detectFamily,
  _test: { decodeBase58, bech32Polymod, bech32HrpExpand, convertBits, decodeBech32 }
};
