'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const catalogModule = require(path.join(projectRoot, 'src', 'main', 'wallet-catalog.js'));
const sourceRoot = path.join(projectRoot, 'node_modules', '@web3icons', 'core', 'dist', 'svgs');
const outputRoot = path.join(projectRoot, 'src', 'main', 'assets', 'token-icons');

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

function copyFirst(candidates, destination) {
  const source = candidates.find((candidate) => fs.existsSync(candidate));
  if (!source) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}

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

let copiedTokens = 0;
let copiedNetworks = 0;

for (const symbol of tokenSymbols) {
  const destination = path.join(outputRoot, 'tokens', `${symbol}.svg`);
  if (copyFirst([
    path.join(sourceRoot, 'tokens', 'branded', `${symbol}.svg`),
    path.join(sourceRoot, 'tokens', 'background', `${symbol}.svg`)
  ], destination)) copiedTokens++;
}

for (const network of networkNames) {
  const destination = path.join(outputRoot, 'networks', `${network}.svg`);
  if (copyFirst([
    path.join(sourceRoot, 'networks', 'branded', `${network}.svg`),
    path.join(sourceRoot, 'networks', 'background', `${network}.svg`)
  ], destination)) copiedNetworks++;
}

console.log(`Prepared ${copiedTokens} token icons and ${copiedNetworks} network icons for SafeLedger.`);
