'use strict';

const crypto = require('crypto');

function text(value) {
  return String(value || '').trim();
}

function safeName(value, fallback) {
  return text(value) || fallback;
}

function normalizePublicAddress(value) {
  const raw = text(value);
  if (!raw) return '';
  if (/^(0x)?[0-9a-fA-F]{40}$/.test(raw)) return raw.replace(/^0x/i, '').toLowerCase();
  if (/^(bc1|tb1|bcrt1)/i.test(raw)) return raw.toLowerCase();
  return raw;
}

function publicAddressDuplicates(profileEntries = []) {
  const seen = new Map();
  for (const entry of profileEntries) {
    const profileName = safeName(entry && entry.profileName, 'Profile');
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    for (const group of groups) {
      const walletName = safeName(group && group.name, 'Unnamed Wallet');
      const records = group && Array.isArray(group.records) ? group.records : [];
      for (const record of records) {
        const normalized = normalizePublicAddress(record && record.publicAddress);
        if (!normalized) continue;
        const refs = seen.get(normalized) || [];
        refs.push({
          profileName,
          walletName,
          assetName: safeName(record && record.name, 'Unnamed Asset')
        });
        seen.set(normalized, refs);
      }
    }
  }
  return Array.from(seen.values())
    .filter((refs) => refs.length > 1)
    .map((refs) => Object.freeze({ kind: 'public-address', count: refs.length, occurrences: Object.freeze(refs) }));
}

function walletMetadataDuplicates(profileEntries = []) {
  const seen = new Map();
  for (const entry of profileEntries) {
    const profileName = safeName(entry && entry.profileName, 'Profile');
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    for (const group of groups) {
      const walletName = safeName(group && group.name, 'Unnamed Wallet');
      const method = text(group && (group.recoveryFormat || group.recoveryStorageMode)).toLowerCase();
      const nameKey = walletName.toLowerCase();
      if (!method || !nameKey) continue;
      const key = `${nameKey}\u0000${method}`;
      const refs = seen.get(key) || [];
      refs.push({ profileName, walletName });
      seen.set(key, refs);
    }
  }
  return Array.from(seen.values())
    .filter((refs) => refs.length > 1)
    .map((refs) => Object.freeze({ kind: 'wallet-method', count: refs.length, occurrences: Object.freeze(refs) }));
}

function normalizeSensitive(value) {
  return text(value).normalize('NFKD').replace(/\s+/gu, ' ').toLowerCase();
}

class SensitiveFingerprintSession {
  constructor(randomBytes = crypto.randomBytes) {
    this._randomBytes = randomBytes;
    this._key = null;
  }

  _ensureKey() {
    if (!this._key) this._key = Buffer.from(this._randomBytes(32));
    if (!Buffer.isBuffer(this._key) || this._key.length !== 32) throw new Error('Sensitive duplicate session requires a random 256-bit key.');
    return this._key;
  }

  fingerprint(value) {
    const normalized = normalizeSensitive(value);
    if (!normalized) return null;
    const key = this._ensureKey();
    return crypto.createHmac('sha256', key).update(normalized, 'utf8').digest('hex');
  }

  findDuplicates(items = []) {
    const seen = new Map();
    for (const item of items) {
      const fingerprint = this.fingerprint(item && item.value);
      if (!fingerprint) continue;
      const refs = seen.get(fingerprint) || [];
      refs.push(Object.freeze({
        profileName: safeName(item && item.profileName, 'Profile'),
        walletName: safeName(item && item.walletName, 'Unnamed Wallet'),
        kind: safeName(item && item.kind, 'sensitive-recovery-data')
      }));
      seen.set(fingerprint, refs);
    }
    return Array.from(seen.values())
      .filter((refs) => refs.length > 1)
      .map((refs) => Object.freeze({ kind: 'sensitive-match', count: refs.length, occurrences: Object.freeze(refs) }));
  }

  clear() {
    if (this._key) this._key.fill(0);
    this._key = null;
  }

  hasSessionKey() {
    return Buffer.isBuffer(this._key);
  }
}

module.exports = {
  normalizePublicAddress,
  publicAddressDuplicates,
  walletMetadataDuplicates,
  SensitiveFingerprintSession,
  _test: { normalizeSensitive }
};
