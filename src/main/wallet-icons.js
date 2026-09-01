'use strict';

const walletCatalog = require('./wallet-catalog');
const web3Icons = require('./web3-icons');

const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

function getIconMatch(wallet) {
  const name = String(wallet && wallet.name || '').trim();
  if (!name) return null;
  return web3Icons.matchFirst([
    { category: 'wallets', values: [name] },
    { category: 'exchanges', values: [name] }
  ]);
}

function iconKey(name) {
  const match = web3Icons.matchFirst([
    { category: 'wallets', values: [name] },
    { category: 'exchanges', values: [name] }
  ]);
  return match ? match.key : slug(name);
}

const catalogNames = new Set((walletCatalog.catalog || [])
  .map((wallet) => String(wallet && wallet.name || '').trim().toLowerCase())
  .filter(Boolean));

function catalogWallet(name) {
  return catalogNames.has(String(name || '').trim().toLowerCase());
}

function badgeLabel(name) {
  const key = slug(name);
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

function fallbackIconMarkup() {
  return '<svg class="sl-wallet-fallback-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="sl-wallet-fallback-outline" d="M4 7h13a3 3 0 0 1 3 3v8H6a3 3 0 0 1-3-3V6.5A2.5 2.5 0 0 1 5.5 4H17"/><path class="sl-wallet-fallback-clasp" d="M15.5 11H21v4h-5.5a2 2 0 0 1 0-4Z"/><circle class="sl-wallet-fallback-dot" cx="17.5" cy="13" r=".8"/></svg>';
}

function createFallbackIcon(name) {
  const fallback = document.createElement('span');
  fallback.className = 'wallet-list-fallback-icon';
  fallback.innerHTML = fallbackIconMarkup();
  fallback.setAttribute('aria-label', `${name || 'Custom'} wallet`);
  fallback.setAttribute('title', 'Custom wallet');
  return fallback;
}

function getIconUrl(wallet) {
  const match = getIconMatch(wallet);
  return match ? match.src : null;
}

function createIconElement(wallet, brandClass = 'wallet-list-brand-image') {
  const match = getIconMatch(wallet);
  const name = String(wallet && wallet.name || 'Wallet');
  if (match) return web3Icons.createImage(match.src, name, brandClass);

  // SafeLedger catalog wallets that predate upstream brand artwork keep their
  // short identifying badge. This remains more useful than making every known
  // no-artwork wallet look identical.
  if (catalogWallet(name)) {
    const badge = document.createElement('span');
    badge.className = 'wallet-list-catalog-icon';
    badge.textContent = badgeLabel(name);
    badge.setAttribute('aria-label', `${name} wallet`);
    return badge;
  }

  // Truly custom/unrecognized wallets use a local SVG wallet instead of the
  // older glyph-style outline that could look like an empty or missing box.
  return createFallbackIcon(name);
}

exports.iconKey = iconKey;
exports.getIconMatch = getIconMatch;
exports.getIconUrl = getIconUrl;
exports.createIconElement = createIconElement;
exports.badgeLabel = badgeLabel;
exports.catalogWallet = catalogWallet;
exports.fallbackIconMarkup = fallbackIconMarkup;
exports.createFallbackIcon = createFallbackIcon;
