'use strict';

const fs = require('fs');
const path = require('path');

// Token/network artwork is copied into SafeLedger's own source tree by
// scripts/prepare-token-assets.js before development/build. At runtime we read
// only those bundled files, so Electron never has to resolve an ESM package or
// a node_modules URL. This remains completely local/offline inside app.asar.
const iconCache = new Map();
const assetRoot = path.join(__dirname, 'assets', 'token-icons');

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

function readSvg(relativePath) {
  if (iconCache.has(relativePath)) return iconCache.get(relativePath);
  try {
    const svg = fs.readFileSync(path.join(assetRoot, relativePath), 'utf8');
    if (!/<svg[\s>]/i.test(svg)) throw new Error('Not an SVG');
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
    iconCache.set(relativePath, dataUrl);
    return dataUrl;
  } catch (_) {
    iconCache.set(relativePath, null);
    return null;
  }
}

function tokenIcon(symbol) {
  const safe = cleanSymbol(symbol);
  return safe ? readSvg(path.join('tokens', `${safe}.svg`)) : null;
}

function networkIcon(name) {
  const normalized = slug(name);
  if (!normalized) return null;
  const mapped = standardNetworkAliases[normalized] || normalized;
  return readSvg(path.join('networks', `${mapped}.svg`));
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
