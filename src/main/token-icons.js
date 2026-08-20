'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// Branded crypto artwork is bundled through @web3icons/core. SafeLedger never
// downloads token artwork at runtime, preserving fully offline/portable use.
const coreRoot = path.dirname(require.resolve('@web3icons/core/package.json'));
const svgRoot = path.join(coreRoot, 'dist', 'svgs');

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

function existingFile(type, variant, fileName) {
  if (!fileName) return null;
  const candidate = path.join(svgRoot, type, variant, `${fileName}.svg`);
  return fs.existsSync(candidate) ? pathToFileURL(candidate).href : null;
}

function tokenIcon(symbol) {
  const safe = cleanSymbol(symbol);
  if (!safe) return null;
  return existingFile('tokens', 'branded', safe);
}

function networkIcon(name) {
  const normalized = slug(name);
  if (!normalized) return null;
  const mapped = standardNetworkAliases[normalized] || normalized;
  return existingFile('networks', 'branded', mapped);
}

exports.getIconUrl = (record) => {
  const item = record || {};
  // Token ticker lookup covers the vast majority of native assets and tokens.
  // Network lookup covers standards/families and chain records without a token
  // artwork entry. Both are local files inside the portable application.
  return tokenIcon(item.symbol) || networkIcon(item.name) || null;
};

exports.createIconElement = (record, className = 'token-brand-image') => {
  const url = exports.getIconUrl(record);
  if (!url) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = url;
  img.alt = `${record && (record.name || record.symbol) ? (record.name || record.symbol) : 'Token'} icon`;
  img.loading = 'lazy';
  img.draggable = false;
  return img;
};
