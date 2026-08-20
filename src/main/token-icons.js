'use strict';

// Use Web3Icons' supported in-memory SVG export API instead of resolving files
// inside node_modules/app.asar. The returned values are already browser-safe
// image sources and remain completely local/offline in the portable build.
let svgs = null;
try {
  const web3icons = require('@web3icons/core');
  svgs = web3icons.svgs || (web3icons.default && web3icons.default.svgs) || null;
} catch (_) {
  svgs = null;
}

const cleanSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
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

function pascalCase(value) {
  return String(value || '').split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function usableSource(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.src || value.default || null;
  return null;
}

function tokenIcon(symbol) {
  if (!svgs || !svgs.tokens) return null;
  const safe = cleanSymbol(symbol);
  if (!safe) return null;
  return usableSource(svgs.tokens[`branded${safe}`]) || usableSource(svgs.tokens[`background${safe}`]) || null;
}

function networkIcon(name) {
  if (!svgs || !svgs.networks) return null;
  const normalized = slug(name);
  if (!normalized) return null;
  const mapped = standardNetworkAliases[normalized] || normalized;
  const key = pascalCase(mapped);
  return usableSource(svgs.networks[`branded${key}`]) || usableSource(svgs.networks[`background${key}`]) || null;
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
  img.addEventListener('error', () => {
    img.style.display = 'none';
  }, { once: true });
  return img;
};
