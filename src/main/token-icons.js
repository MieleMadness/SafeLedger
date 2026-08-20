'use strict';

const fs = require('fs');
const path = require('path');

// Branded crypto artwork is bundled through @web3icons/core. SafeLedger never
// downloads token artwork at runtime, preserving fully offline/portable use.
//
// Electron's Node side can read files from inside app.asar, while Chromium's
// direct file:// loading of those same nested paths can be unreliable. Read the
// SVG through Node and expose it to the renderer as an in-memory data URI.
function findCoreRoot() {
  let current = path.dirname(require.resolve('@web3icons/core'));
  const root = path.parse(current).root;
  while (current && current !== root) {
    if (fs.existsSync(path.join(current, 'dist', 'svgs'))) return current;
    current = path.dirname(current);
  }
  return null;
}

const coreRoot = findCoreRoot();
const svgRoot = coreRoot ? path.join(coreRoot, 'dist', 'svgs') : '';
const iconCache = new Map();

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

function svgDataUri(filePath) {
  if (!filePath) return null;
  if (iconCache.has(filePath)) return iconCache.get(filePath);
  try {
    const svg = fs.readFileSync(filePath, 'utf8');
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
    iconCache.set(filePath, uri);
    return uri;
  } catch (_) {
    iconCache.set(filePath, null);
    return null;
  }
}

function existingFile(type, variant, fileName) {
  if (!svgRoot || !fileName) return null;
  const candidate = path.join(svgRoot, type, variant, `${fileName}.svg`);
  return fs.existsSync(candidate) ? svgDataUri(candidate) : null;
}

function tokenIcon(symbol) {
  const safe = cleanSymbol(symbol);
  if (!safe) return null;
  return existingFile('tokens', 'branded', safe)
    || existingFile('tokens', 'background', safe)
    || existingFile('tokens', 'mono', safe);
}

function networkIcon(name) {
  const normalized = slug(name);
  if (!normalized) return null;
  const mapped = standardNetworkAliases[normalized] || normalized;
  return existingFile('networks', 'branded', mapped)
    || existingFile('networks', 'background', mapped)
    || existingFile('networks', 'mono', mapped);
}

exports.getIconUrl = (record) => {
  const item = record || {};
  // Token ticker lookup covers native assets and named tokens. Network lookup
  // handles standards/families and chain records without a token-art entry.
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
