'use strict';

// Minimal local Keccak-256 implementation for EIP-55 checksum validation.
// This intentionally implements Keccak padding (0x01), not FIPS SHA3 padding.

const MASK_64 = (1n << 64n) - 1n;
const RATE_BYTES = 136;
const ROUND_CONSTANTS = Object.freeze([
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
]);
const ROTATION = Object.freeze([
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14
]);

function rotl64(value, shift) {
  const n = BigInt(shift);
  const v = value & MASK_64;
  if (n === 0n) return v;
  return ((v << n) | (v >> (64n - n))) & MASK_64;
}

function keccakF(state) {
  for (const rc of ROUND_CONSTANTS) {
    const c = new Array(5);
    const d = new Array(5);
    for (let x = 0; x < 5; x++) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    for (let x = 0; x < 5; x++) d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) state[x + (5 * y)] = (state[x + (5 * y)] ^ d[x]) & MASK_64;
    }

    const b = new Array(25).fill(0n);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const source = x + (5 * y);
        const destination = y + (5 * ((2 * x + 3 * y) % 5));
        b[destination] = rotl64(state[source], ROTATION[source]);
      }
    }

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const index = x + (5 * y);
        state[index] = (b[index] ^ (((~b[((x + 1) % 5) + (5 * y)]) & MASK_64) & b[((x + 2) % 5) + (5 * y)])) & MASK_64;
      }
    }
    state[0] = (state[0] ^ rc) & MASK_64;
  }
}

function xorBlock(state, block) {
  for (let lane = 0; lane < RATE_BYTES / 8; lane++) {
    let value = 0n;
    for (let byte = 0; byte < 8; byte++) value |= BigInt(block[(lane * 8) + byte] || 0) << BigInt(byte * 8);
    state[lane] = (state[lane] ^ value) & MASK_64;
  }
}

function keccak256Bytes(input) {
  const bytes = Buffer.isBuffer(input) ? Buffer.from(input) : Buffer.from(String(input), 'utf8');
  const state = new Array(25).fill(0n);
  let offset = 0;
  while (offset + RATE_BYTES <= bytes.length) {
    xorBlock(state, bytes.subarray(offset, offset + RATE_BYTES));
    keccakF(state);
    offset += RATE_BYTES;
  }

  const finalBlock = Buffer.alloc(RATE_BYTES);
  bytes.copy(finalBlock, 0, offset);
  finalBlock[bytes.length - offset] ^= 0x01;
  finalBlock[RATE_BYTES - 1] ^= 0x80;
  xorBlock(state, finalBlock);
  keccakF(state);

  const output = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    const lane = state[Math.floor(i / 8)];
    output[i] = Number((lane >> BigInt((i % 8) * 8)) & 0xffn);
  }
  finalBlock.fill(0);
  bytes.fill(0);
  return output;
}

function keccak256Hex(input) {
  const digest = keccak256Bytes(input);
  try { return digest.toString('hex'); }
  finally { digest.fill(0); }
}

module.exports = { keccak256Bytes, keccak256Hex, _test: { rotl64, keccakF } };
