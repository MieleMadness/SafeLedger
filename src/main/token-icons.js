'use strict';

const fs = require('fs');

// SafeLedger resolves Web3Icons through the package's exported SVG paths rather
// than guessing where npm/electron-builder placed the package. This works from
// development, node_modules and the packaged app.asar. SVG contents are read by
// Node and converted to data URLs, so Chromium never has to open an ASAR file URL.
const svgCache = new Map();

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

function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function readExportedSvg(type, variant, iconName) {
  if (!iconName) return null;
  const cacheKey = `${type}/${variant}/${iconName}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  const requests = [
    `@web3icons/core/svgs/${type}/${variant}/${iconName}.svg`,
    `@web3icons/core/svgs/${type}/${variant}/${iconName}.svg.js`
  ];

  for (const request of requests) {
    try {
      const resolved = require.resolve(request);
      const candidates = [resolved];
      if (resolved.endsWith('.svg.js')) candidates.unshift(resolved.slice(0, -3));
      for (const candidate of candidates) {
        try {
          const contents = fs.readFileSync(candidate, 'utf8');
          if (/<svg[\s>]/i.test(contents)) {
            const url = toDataUrl(contents);
            svgCache.set(cacheKey, url);
            return url;
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  svgCache.set(cacheKey, null);
  return null;
}

function tokenIcon(symbol) {
  const safe = cleanSymbol(symbol);
  if (!safe) return null;
  return readExportedSvg('tokens', 'branded', safe) || readExportedSvg('tokens', 'background', safe);
}

function networkIcon(name) {
  const normalized = slug(name);
  if (!normalized) return null;
  const mapped = standardNetworkAliases[normalized] || normalized;
  return readExportedSvg('networks', 'branded', mapped) || readExportedSvg('networks', 'background', mapped);
}

exports.getIconUrl = (record) => {
  const item = record || {};
  return tokenIcon(item.symbol) || networkIcon(item.name) || null;
};

exports.createIconElement = (record, className = 'token-brand-image') => {
  const url = exports.getIconUrl(record);
  if (!url) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = url;
  img.alt = `${record && (record.name || record.symbol) ? (record.name || record.symbol) : 'Token'} icon`;
  img.draggable = false;
  return img;
};
