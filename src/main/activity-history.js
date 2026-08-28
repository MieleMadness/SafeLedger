'use strict';

const EVENT_DEFINITIONS = Object.freeze({
  'app-opened': Object.freeze({ label: 'SafeLedger opened', category: 'system', icon: 'fa-power-off' }),
  'vault-unlocked': Object.freeze({ label: 'SafeLedger unlocked', category: 'security', icon: 'fa-unlock' }),
  'emergency-lock': Object.freeze({ label: 'Emergency lock activated', category: 'security', icon: 'fa-lock' }),
  'inactivity-auto-lock': Object.freeze({ label: 'Inactivity auto-lock activated', category: 'security', icon: 'fa-clock-o' }),
  'post-restore-lock': Object.freeze({ label: 'SafeLedger locked after restore', category: 'security', icon: 'fa-lock' }),
  'complete-data-backup-exported': Object.freeze({ label: 'Complete backup created', category: 'data', icon: 'fa-archive' }),
  'complete-data-backup-restored': Object.freeze({ label: 'Complete backup restored', category: 'data', icon: 'fa-history' }),
  'profile-created': Object.freeze({ label: 'Profile created', category: 'data', icon: 'fa-user-plus' }),
  'profile-updated': Object.freeze({ label: 'Profile updated', category: 'data', icon: 'fa-user' }),
  'profile-deleted': Object.freeze({ label: 'Profile deleted', category: 'data', icon: 'fa-user-times' }),
  'wallet-created': Object.freeze({ label: 'Wallet created', category: 'data', icon: 'fa-plus-circle' }),
  'wallet-updated': Object.freeze({ label: 'Wallet updated', category: 'data', icon: 'fa-pencil' }),
  'wallet-deleted': Object.freeze({ label: 'Wallet deleted', category: 'data', icon: 'fa-trash' }),
  'asset-created': Object.freeze({ label: 'Asset created', category: 'data', icon: 'fa-plus-circle' }),
  'asset-updated': Object.freeze({ label: 'Asset updated', category: 'data', icon: 'fa-pencil' }),
  'asset-deleted': Object.freeze({ label: 'Asset deleted', category: 'data', icon: 'fa-trash' }),
  'recovery-verified': Object.freeze({ label: 'Recovery information verified', category: 'recovery', icon: 'fa-check-circle' }),
  'recovery-drill-completed': Object.freeze({ label: 'Recovery drill completed', category: 'recovery', icon: 'fa-shield' }),
  'recovery-binder-prepared': Object.freeze({ label: 'Recovery Binder prepared for printing', category: 'recovery', icon: 'fa-book' }),
  'settings-updated': Object.freeze({ label: 'Settings updated', category: 'system', icon: 'fa-cog' }),
  'self-destruct-protection-changed': Object.freeze({ label: 'Self-Destruct Protection changed', category: 'security', icon: 'fa-exclamation-triangle' }),
  'self-destruct-triggered': Object.freeze({ label: 'Self-Destruct Protection triggered', category: 'security', icon: 'fa-exclamation-circle' }),
  'security-event': Object.freeze({ label: 'Security event recorded', category: 'security', icon: 'fa-shield' })
});

const MAX_STORED_ENTRIES = 500;
const DEFAULT_READ_LIMIT = 100;
const MAX_READ_LIMIT = 200;

function eventName(value) {
  return String(value || '').trim();
}

function isKnownEvent(value) {
  return Object.prototype.hasOwnProperty.call(EVENT_DEFINITIONS, eventName(value));
}

function normalizeEvent(value) {
  const name = eventName(value);
  return isKnownEvent(name) ? name : 'security-event';
}

function describe(value) {
  const type = normalizeEvent(value);
  return Object.freeze({ type, ...EVENT_DEFINITIONS[type] });
}

function normalizeLimit(value, fallback = DEFAULT_READ_LIMIT) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, MAX_READ_LIMIT);
}

function serialize(timestamp, event) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error('Activity history requires a valid timestamp.');
  return `${date.toISOString()}\t${normalizeEvent(event)}\n`;
}

function parseLine(line) {
  const parts = String(line || '').replace(/\r$/, '').split('\t');
  if (parts.length !== 2 || !isKnownEvent(parts[1])) return null;
  const date = new Date(parts[0]);
  if (Number.isNaN(date.getTime())) return null;
  return { timestamp: date.toISOString(), event: parts[1] };
}

function parseChronological(raw) {
  const entries = [];
  for (const line of String(raw || '').split('\n')) {
    if (!line) continue;
    const parsed = parseLine(line);
    if (parsed) entries.push(parsed);
  }
  return entries;
}

function parseLog(raw, limit = DEFAULT_READ_LIMIT) {
  const count = normalizeLimit(limit);
  return parseChronological(raw).slice(-count).reverse();
}

function compactLog(raw, maxEntries = MAX_STORED_ENTRIES) {
  const max = Math.max(1, Math.min(Number.parseInt(maxEntries, 10) || MAX_STORED_ENTRIES, MAX_STORED_ENTRIES));
  return parseChronological(raw)
    .slice(-max)
    .map((entry) => serialize(entry.timestamp, entry.event))
    .join('');
}

module.exports = {
  EVENT_DEFINITIONS,
  MAX_STORED_ENTRIES,
  DEFAULT_READ_LIMIT,
  MAX_READ_LIMIT,
  isKnownEvent,
  normalizeEvent,
  describe,
  normalizeLimit,
  serialize,
  parseLine,
  parseLog,
  compactLog,
  _test: { eventName, parseChronological }
};
