'use strict';

const serviceCatalog = require('./service-catalog');

const WEB3_CATEGORIES = Object.freeze(['tokens', 'networks', 'wallets', 'exchanges']);

// Curated SafeLedger-owned local icon choices exposed by the Profile picker.
// Keep one canonical choice for visually identical aliases so the picker stays
// useful instead of presenting duplicate artwork under multiple names.
const GENERAL_ICONS = Object.freeze([
  ['fa-times', 'Close'], ['fa-search', 'Search'], ['fa-home', 'Home'], ['fa-history', 'History'], ['fa-refresh', 'Refresh'],
  ['fa-folder-open', 'Open Folder'], ['fa-folder-o', 'Folder'],
  ['fa-star', 'Star'], ['fa-star-o', 'Star Outline'], ['fa-life-ring', 'Recovery'], ['fa-power-off', 'Power'],
  ['fa-unlock', 'Unlock'], ['fa-lock', 'Lock'], ['fa-external-link', 'Open External'],
  ['fa-user', 'User'], ['fa-user-plus', 'Add User'], ['fa-user-times', 'Remove User'], ['fa-users', 'Users'],
  ['fa-save', 'Save'], ['glyphicon-piggy-bank', 'Wallet'], ['fa-clock-o', 'Clock'],
  ['fa-archive', 'Archive'], ['fa-exclamation-circle', 'Alert Circle'], ['fa-mobile', 'Mobile'], ['fa-database', 'Database'],
  ['fa-map-marker', 'Location'], ['fa-globe', 'Globe'], ['fa-check-circle', 'Check Circle'], ['fa-pencil', 'Edit'],
  ['fa-paint-brush', 'Appearance'], ['fa-print', 'Print'], ['fa-book', 'Book'], ['fa-trash', 'Delete'],
  ['fa-credit-card', 'Card'], ['fa-circle-o', 'Circle'], ['fa-shield', 'Shield'], ['fa-eye', 'Visible'], ['fa-eye-slash', 'Hidden'],
  ['fa-copy', 'Copy'], ['fa-qrcode', 'QR Code'], ['fa-info-circle', 'Information'],
  ['fa-plus', 'Plus'], ['fa-minus', 'Minus'],
  ['fa-chevron-left', 'Chevron Left'], ['fa-chevron-right', 'Chevron Right'],
  ['fa-chevron-down', 'Chevron Down'], ['fa-chevron-up', 'Chevron Up'], ['fa-cog', 'Settings'], ['fa-download', 'Download'],
  ['fa-upload', 'Upload'], ['fa-exchange', 'Exchange'], ['fa-key', 'Key'], ['fa-file-text-o', 'Document'], ['fa-list', 'List'],
  ['fa-check', 'Check'], ['fa-warning', 'Warning']
].map(([key, label]) => Object.freeze({ key, label })));

const GENERAL_ICON_KEYS = new Set(GENERAL_ICONS.map((entry) => entry.key));
const WEB3_CATEGORY_KEYS = new Set(WEB3_CATEGORIES);
const WEB3_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSelection(value) {
  if (value == null || value === '') return null;
  if (!isPlainObject(value)) throw new Error('Invalid Profile icon selection.');

  const type = String(value.type || '').trim().toLowerCase();
  if (type === 'web3') {
    const category = String(value.category || '').trim().toLowerCase();
    const key = String(value.key || '').trim();
    if (!WEB3_CATEGORY_KEYS.has(category) || !WEB3_KEY.test(key)) throw new Error('Invalid crypto Profile icon selection.');
    return { type: 'web3', category, key };
  }

  if (type === 'service') {
    const service = serviceCatalog.find(value.key);
    if (!service) throw new Error('Invalid service Profile icon selection.');
    return { type: 'service', key: service.name };
  }

  if (type === 'local') {
    const key = String(value.key || '').trim().toLowerCase();
    if (!GENERAL_ICON_KEYS.has(key)) throw new Error('Invalid general Profile icon selection.');
    return { type: 'local', key };
  }

  throw new Error('Invalid Profile icon selection.');
}

function tryNormalizeSelection(value) {
  try { return normalizeSelection(value); } catch (_) { return null; }
}

function selectionId(value) {
  const icon = tryNormalizeSelection(value);
  if (!icon) return 'initial';
  if (icon.type === 'web3') return `web3:${icon.category}:${icon.key}`;
  return `${icon.type}:${icon.key}`;
}

function sameSelection(a, b) {
  return selectionId(a) === selectionId(b);
}

exports.WEB3_CATEGORIES = WEB3_CATEGORIES;
exports.GENERAL_ICONS = GENERAL_ICONS;
exports.normalizeSelection = normalizeSelection;
exports.tryNormalizeSelection = tryNormalizeSelection;
exports.selectionId = selectionId;
exports.sameSelection = sameSelection;
