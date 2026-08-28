'use strict';

// Generated at build time by scripts/prepare-token-assets.js. The manifest
// contains browser-ready data URLs, so runtime icon rendering has no dependency
// on node_modules, ESM imports, external URLs, or filesystem paths.
let manifest = { tokens: {}, networks: {} };
try {
  manifest = require('./assets/token-icons/manifest.json');
} catch (_) {
  manifest = { tokens: {}, networks: {} };
}

const cleanSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

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

function tokenIcon(symbol) {
  const safe = cleanSymbol(symbol);
  return safe && manifest.tokens ? manifest.tokens[safe] || null : null;
}

function networkIcon(name) {
  const normalized = slug(name);
  if (!normalized || !manifest.networks) return null;
  const mapped = standardNetworkAliases[normalized] || normalized;
  return manifest.networks[mapped] || null;
}

exports.getIconUrl = (record) => {
  const item = record || {};
  return tokenIcon(item.symbol) || networkIcon(item.name) || null;
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
