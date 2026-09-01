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

function getIconUrl(wallet) {
  const match = getIconMatch(wallet);
  return match ? match.src : null;
}

function createIconElement(wallet, brandClass = 'wallet-list-brand-image') {
  const match = getIconMatch(wallet);
  const name = String(wallet && wallet.name || 'Wallet');
  if (match) return web3Icons.createImage(match.src, name, brandClass);

  // SafeLedger's built-in catalog remains usable even when a wallet is absent
  // from the pinned Web3Icons release. A distinct badge avoids a row of
  // identical generic outlines while keeping the application fully offline.
  if (catalogWallet(name)) {
    const badge = document.createElement('span');
    badge.className = 'wallet-list-catalog-icon';
    badge.textContent = badgeLabel(name);
    badge.setAttribute('aria-label', `${name} wallet`);
    return badge;
  }

  // Truly custom names that are not recognized as a Web3 wallet or exchange
  // use the neutral local wallet outline.
  const fallback = document.createElement('span');
  fallback.className = 'glyphicon glyphicon-piggy-bank wallet-list-icon';
  fallback.setAttribute('aria-label', `${name} wallet`);
  return fallback;
}

exports.iconKey = iconKey;
exports.getIconMatch = getIconMatch;
exports.getIconUrl = getIconUrl;
exports.createIconElement = createIconElement;
exports.badgeLabel = badgeLabel;
exports.catalogWallet = catalogWallet;
