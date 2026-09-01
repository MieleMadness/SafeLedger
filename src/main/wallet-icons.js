'use strict';

const walletCatalog = require('./wallet-catalog');

// Generated at build time by scripts/prepare-token-assets.js. Wallet artwork is
// stored as data URLs inside the same local manifest as asset/network artwork,
// so SafeLedger never fetches a logo from the internet at runtime.
let manifest = { wallets: {} };
try {
  manifest = require('./assets/token-icons/manifest.json');
} catch (_) {
  manifest = { wallets: {} };
}

const walletAliases = Object.freeze({
  'base-app': 'coinbase',
  'coinbase-wallet': 'coinbase',
  'bitbox02-multi': 'bitbox',
  'trust-wallet': 'trust',
  'rabby-wallet': 'rabby'
});

const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

function iconKey(name) {
  const normalized = slug(name);
  return walletAliases[normalized] || normalized;
}

const catalogIconKeys = new Set((walletCatalog.catalog || []).map((wallet) => iconKey(wallet && wallet.name)).filter(Boolean));

function catalogWallet(name) {
  return catalogIconKeys.has(iconKey(name));
}

function badgeLabel(name) {
  const key = iconKey(name);
  const special = {
    onekey: '1K',
    safepal: 'SP',
    coldcard: 'CC',
    electrum: 'E',
    keystone: 'K',
    tangem: 'T',
    sparrow: 'S',
    nunchuk: 'N'
  };
  if (special[key]) return special[key];

  const words = String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (!words.length) return 'W';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function getIconUrl(wallet) {
  const key = iconKey(wallet && wallet.name);
  return key && manifest.wallets ? manifest.wallets[key] || null : null;
}

function createIconElement(wallet, brandClass = 'wallet-list-brand-image') {
  const src = getIconUrl(wallet);
  const name = String(wallet && wallet.name || 'Wallet');
  if (src) {
    const img = document.createElement('img');
    img.className = brandClass;
    img.src = src;
    img.alt = `${name} icon`;
    img.draggable = false;
    return img;
  }

  // Catalog wallets should never all degrade to the same shape. If the pinned
  // Web3Icons release does not ship a particular brand yet, use a compact,
  // name-specific badge so Electrum/OneKey/SafePal/Tangem remain distinct.
  if (catalogWallet(name)) {
    const badge = document.createElement('span');
    badge.className = 'wallet-list-catalog-icon';
    badge.textContent = badgeLabel(name);
    badge.setAttribute('aria-label', `${name} wallet`);
    return badge;
  }

  // A truly custom/unknown wallet gets the neutral local wallet outline.
  const fallback = document.createElement('span');
  fallback.className = 'glyphicon glyphicon-piggy-bank wallet-list-icon';
  fallback.setAttribute('aria-label', `${name} wallet`);
  return fallback;
}

exports.iconKey = iconKey;
exports.getIconUrl = getIconUrl;
exports.createIconElement = createIconElement;
exports.badgeLabel = badgeLabel;
exports.catalogWallet = catalogWallet;
