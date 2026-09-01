'use strict';

// Wallet artwork is generated at build time by scripts/prepare-token-assets.js.
// The generated manifest contains browser-ready local data URLs and aliases so
// SafeLedger remains fully offline and can recognize user-created wallet names.
let manifest = { icons: {}, wallets: {} };
try {
  manifest = require('./assets/token-icons/manifest.json');
} catch (_) {
  manifest = { icons: {}, wallets: {} };
}

const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const explicitAliases = {
  'base-app': 'coinbase',
  'base-app-coinbase-wallet': 'coinbase',
  'coinbase-wallet': 'coinbase',
  'bitbox02': 'bitbox',
  'bitbox02-multi': 'bitbox',
  'rabby-wallet': 'rabby'
};

function resolveStoredIcon(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.startsWith('data:image/')) return value; // Version-2 manifest compatibility.
  return manifest.icons && manifest.icons[value] ? manifest.icons[value] : null;
}

let compactIndex = null;
function getCompactIndex() {
  if (compactIndex) return compactIndex;
  compactIndex = new Map();
  for (const key of Object.keys(manifest.wallets || {})) {
    const compact = key.replace(/[^a-z0-9]/g, '');
    if (compact && !compactIndex.has(compact)) compactIndex.set(compact, key);
  }
  return compactIndex;
}

function candidates(name) {
  const key = slug(name);
  if (!key) return [];
  const values = [key, explicitAliases[key]];
  if (key.endsWith('-wallet')) values.push(key.slice(0, -7));
  if (key.endsWith('wallet') && !key.endsWith('-wallet')) values.push(key.slice(0, -6).replace(/-+$/g, ''));
  return [...new Set(values.filter(Boolean))];
}

exports.getIconUrl = (name) => {
  const keys = candidates(name);
  for (const key of keys) {
    const direct = resolveStoredIcon(manifest.wallets && manifest.wallets[key]);
    if (direct) return direct;
  }

  // Compact matching handles common punctuation/casing variants such as
  // WalletConnect -> wallet-connect and MyEtherWallet -> my-ether-wallet.
  const compact = getCompactIndex();
  for (const key of keys) {
    const matched = compact.get(key.replace(/[^a-z0-9]/g, ''));
    const source = matched && resolveStoredIcon(manifest.wallets[matched]);
    if (source) return source;
  }
  return null;
};

exports.hasIcon = (name) => Boolean(exports.getIconUrl(name));

exports.createIconElement = (name, className = 'wallet-brand-image') => {
  const src = exports.getIconUrl(name);
  if (!src || typeof document === 'undefined') return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = src;
  img.alt = `${String(name || 'Wallet')} icon`;
  img.draggable = false;
  return img;
};

exports.slug = slug;
