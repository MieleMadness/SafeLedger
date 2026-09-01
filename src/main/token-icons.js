'use strict';

// Generated at build time by scripts/prepare-token-assets.js. The manifest
// contains browser-ready local data URLs plus lookup aliases, so runtime icon
// rendering has no dependency on node_modules, external URLs, or filesystem paths.
let manifest = { icons: {}, tokens: {}, tokenNames: {}, networks: {} };
try {
  manifest = require('./assets/token-icons/manifest.json');
} catch (_) {
  manifest = { icons: {}, tokens: {}, tokenNames: {}, networks: {} };
}

const cleanSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Retained for compatibility with older generated manifests and SafeLedger's
// user-friendly network-family names.
const standardNetworkAliases = {
  'bnb': 'binance-smart-chain',
  'bnb-chain': 'binance-smart-chain',
  'bnb-smart-chain': 'binance-smart-chain',
  'bnb-beacon-chain': 'binance-smart-chain',
  'avalanche-c-chain': 'avalanche',
  'arbitrum-one': 'arbitrum',
  'arbitrum-nova': 'arbitrum',
  'polygon-zkevm': 'polygon-zkevm',
  'hyperliquid-evm': 'hyperliquid',
  'hyperevm': 'hyperliquid',
  'cronos-evm': 'cronos',
  'kava-evm': 'kava',
  'linea-evm': 'linea',
  'scroll-evm': 'scroll',
  'telos-evm': 'telos',
  'plasma-evm': 'plasma',
  'chiliz-evm': 'chiliz',
  'evm-networks': 'ethereum',
  'evm-tokens': 'ethereum',
  'erc-20-tokens': 'ethereum',
  'erc-20-evm-tokens': 'ethereum',
  'spl-tokens': 'solana',
  'network-tokens': 'ethereum',
  'trc-20-tokens': 'tron',
  'bep-20-tokens': 'binance-smart-chain',
  'cardano-native-tokens': 'cardano',
  'custom-tokens': 'ethereum'
};

function resolveStoredIcon(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.startsWith('data:image/')) return value; // Version-2 manifest compatibility.
  return manifest.icons && manifest.icons[value] ? manifest.icons[value] : null;
}

function lookup(map, key) {
  return key && map ? resolveStoredIcon(map[key]) : null;
}

function tokenIcon(symbol) {
  return lookup(manifest.tokens, cleanSymbol(symbol));
}

function tokenNameIcon(name) {
  return lookup(manifest.tokenNames, slug(name));
}

function networkIcon(name) {
  const normalized = slug(name);
  if (!normalized) return null;
  return lookup(manifest.networks, normalized) || lookup(manifest.networks, standardNetworkAliases[normalized]);
}

exports.getIconUrl = (record) => {
  const item = record || {};
  // Explicit symbols remain the strongest signal. For a manually added entry
  // without a symbol, prefer a matching network name, then a Web3Icons token name.
  return tokenIcon(item.symbol) || networkIcon(item.name) || tokenNameIcon(item.name) || null;
};

exports.createIconElement = (record, className = 'token-brand-image') => {
  const src = exports.getIconUrl(record);
  if (!src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = src;
  img.alt = `${record && (record.name || record.symbol) ? (record.name || record.symbol) : 'Token'} icon`;
  img.draggable = false;
  return img;
};

exports.cleanSymbol = cleanSymbol;
exports.slug = slug;
