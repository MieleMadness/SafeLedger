'use strict';

// Wallet artwork is generated at build time by scripts/prepare-token-assets.js.
// The generated manifest contains browser-ready data URLs so SafeLedger remains
// fully offline at runtime and never needs a wallet-logo network request.
let manifest = { wallets: {} };
try {
  manifest = require('./assets/token-icons/manifest.json');
} catch (_) {
  manifest = { wallets: {} };
}

const normalize = (value) => String(value || '').trim().toLowerCase();

const aliases = {
  'coinbase wallet': 'base app (coinbase wallet)',
  'base app': 'base app (coinbase wallet)',
  'bitbox': 'bitbox02 multi',
  'bitbox02': 'bitbox02 multi',
  'rabby': 'rabby wallet'
};

function canonicalName(name) {
  const normalized = normalize(name);
  return aliases[normalized] || normalized;
}

exports.getIconUrl = (name) => {
  const key = canonicalName(name);
  return key && manifest.wallets ? manifest.wallets[key] || null : null;
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

exports.canonicalName = canonicalName;
