'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const projectRoot = path.resolve(__dirname, '..');
const catalogModule = require(path.join(projectRoot, 'src', 'main', 'wallet-catalog.js'));
const sourceRoot = path.join(projectRoot, 'node_modules', '@web3icons', 'core', 'dist', 'svgs');
const outputRoot = path.join(projectRoot, 'src', 'main', 'assets', 'token-icons');
const manifestPath = path.join(outputRoot, 'manifest.json');

const excludedWallets = new Set([
  'bitbox02 multi',
  'coldcard',
  'keystone',
  'rabby wallet'
]);

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

const normalize = (value) => String(value || '').trim().toLowerCase();
const cleanSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function normalizeIconSource(value, modulePath) {
  if (!value) return null;
  if (typeof value === 'object') {
    return normalizeIconSource(value.default || value.src, modulePath);
  }
  if (typeof value !== 'string') return null;
  if (value.startsWith('data:image/')) return value;
  if (/<svg[\s>]/i.test(value)) return toDataUrl(value);

  const possibleFile = path.isAbsolute(value) ? value : path.resolve(path.dirname(modulePath), value);
  if (fs.existsSync(possibleFile)) {
    const contents = fs.readFileSync(possibleFile, 'utf8');
    if (/<svg[\s>]/i.test(contents)) return toDataUrl(contents);
  }
  return null;
}

async function loadIcon(type, variant, name) {
  const base = path.join(sourceRoot, type, variant, `${name}.svg`);
  const rawPath = base;
  if (fs.existsSync(rawPath)) {
    const contents = fs.readFileSync(rawPath, 'utf8');
    if (/<svg[\s>]/i.test(contents)) return toDataUrl(contents);
  }

  const modulePath = `${base}.js`;
  if (!fs.existsSync(modulePath)) return null;
  try {
    const imported = await import(`${pathToFileURL(modulePath).href}?safeledger=${Date.now()}`);
    return normalizeIconSource(imported.default || imported, modulePath);
  } catch (error) {
    console.warn(`Unable to prepare ${type}/${variant}/${name}: ${error.message}`);
    return null;
  }
}

async function loadBestIcon(type, name) {
  return (await loadIcon(type, 'branded', name)) ||
    (await loadIcon(type, 'background', name)) ||
    (await loadIcon(type, 'mono', name));
}

async function main() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Web3Icons SVG directory was not found: ${sourceRoot}`);
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const tokenSymbols = new Set();
  const networkNames = new Set();

  for (const wallet of catalogModule.catalog || []) {
    if (excludedWallets.has(normalize(wallet.name))) continue;
    for (const entry of wallet.records || []) {
      const [name, symbol] = entry;
      const safeSymbol = cleanSymbol(symbol);
      if (safeSymbol) tokenSymbols.add(safeSymbol);
      const normalizedName = slug(name);
      if (normalizedName) networkNames.add(standardNetworkAliases[normalizedName] || normalizedName);
    }
  }

  const manifest = { version: 1, tokens: {}, networks: {} };

  for (const symbol of [...tokenSymbols].sort()) {
    const source = await loadBestIcon('tokens', symbol);
    if (source) manifest.tokens[symbol] = source;
  }

  for (const network of [...networkNames].sort()) {
    const source = await loadBestIcon('networks', network);
    if (source) manifest.networks[network] = source;
  }

  if (!manifest.tokens.BTC) {
    throw new Error('SafeLedger token icon preparation failed: branded/background BTC artwork was not found. Build stopped to prevent an iconless release.');
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
  console.log(`Prepared ${Object.keys(manifest.tokens).length} token icons and ${Object.keys(manifest.networks).length} network icons for SafeLedger.`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
