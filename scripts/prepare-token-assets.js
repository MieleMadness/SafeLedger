'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'src', 'main', 'assets', 'token-icons');
const manifestPath = path.join(outputRoot, 'manifest.json');

const categories = ['tokens', 'networks', 'wallets', 'exchanges'];
const variants = ['branded', 'background', 'mono'];

// These preserve SafeLedger terminology that is intentionally broader than a
// single Web3Icons metadata name. They are only installed when the target icon
// exists in the pinned Web3Icons package.
const safeLedgerAliases = {
  networks: {
    bnb: 'binance-smart-chain',
    'bnb-chain': 'binance-smart-chain',
    'bnb-beacon-chain': 'binance-smart-chain',
    'avalanche-c-chain': 'avalanche',
    'arbitrum-one': 'arbitrum',
    'arbitrum-nova': 'arbitrum',
    'hyperliquid-evm': 'hyper-evm',
    hyperevm: 'hyper-evm',
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
  },
  wallets: {
    'base-app': 'coinbase',
    'base-app-coinbase-wallet': 'coinbase',
    'coinbase-wallet': 'coinbase',
    'bitbox02-multi': 'bitbox',
    'trust-wallet': 'trust',
    'rabby-wallet': 'rabby'
  },
  exchanges: {
    // Kraken Wallet uses the local Kraken brand artwork supplied by Web3Icons.
    'kraken-wallet': 'kraken'
  }
};

function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function normalizeIconSource(value) {
  if (!value) return null;
  if (typeof value === 'object') return normalizeIconSource(value.default || value.src);
  if (typeof value !== 'string') return null;
  if (value.startsWith('data:image/')) return value;
  if (/<svg[\s>]/i.test(value)) return toDataUrl(value);
  return null;
}

function lookupKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function lookupVariants(value) {
  const normalized = lookupKey(value);
  if (!normalized) return [];
  const compact = normalized.replace(/-/g, '');
  return compact && compact !== normalized ? [normalized, compact] : [normalized];
}

function addAlias(aliasMap, value, canonical) {
  if (!canonical) return;
  for (const key of lookupVariants(value)) {
    // Metadata order is meaningful for collisions (tokens are broadly ranked),
    // so the first exact human-name/symbol match wins rather than changing on
    // every build because of object enumeration order.
    if (!aliasMap[key]) aliasMap[key] = canonical;
  }
}

function preferredVariants(category) {
  return category === 'wallets' || category === 'exchanges'
    ? ['background', 'branded', 'mono']
    : ['branded', 'background', 'mono'];
}

function availableKeys(svgCategory) {
  const keys = new Set();
  for (const variant of variants) {
    for (const key of Object.keys(svgCategory && svgCategory[variant] || {})) keys.add(key);
  }
  return [...keys].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
}

function bestSource(svgCategory, key, category) {
  for (const variant of preferredVariants(category)) {
    const source = normalizeIconSource(svgCategory && svgCategory[variant] && svgCategory[variant][key]);
    if (source) return source;
  }
  return null;
}

function outputKey(category, key) {
  return category === 'tokens' ? String(key).toUpperCase() : String(key);
}

function metadataCanonical(category, entry) {
  if (category === 'tokens') return String(entry && entry.symbol || '').toUpperCase();
  return String(entry && entry.id || '');
}

function metadataValues(category, entry) {
  const values = [entry && entry.id, entry && entry.name];
  if (category === 'tokens') values.push(entry && entry.symbol);
  if (category === 'networks') values.push(entry && entry.shortName);
  if (entry && entry.filePath && String(entry.filePath).includes(':')) {
    values.push(String(entry.filePath).split(':').slice(1).join(':'));
  }
  return values.filter(Boolean);
}

function humanizeIconKey(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function buildCategory(manifest, svgCatalog, category) {
  const svgCategory = svgCatalog && svgCatalog[category] || {};
  for (const key of availableKeys(svgCategory)) {
    const source = bestSource(svgCategory, key, category);
    if (!source) continue;
    const canonical = outputKey(category, key);
    manifest[category][canonical] = source;
    addAlias(manifest.aliases[category], key, canonical);
    addAlias(manifest.aliases[category], canonical, canonical);
  }
}

function applyMetadataAliases(manifest, metadata, category) {
  const entries = Array.isArray(metadata && metadata[category]) ? metadata[category] : [];
  for (const entry of entries) {
    const canonical = metadataCanonical(category, entry);
    if (!canonical || !manifest[category][canonical]) continue;
    for (const value of metadataValues(category, entry)) {
      addAlias(manifest.aliases[category], value, canonical);
    }
    if ((category === 'wallets' || category === 'exchanges') && entry && entry.name) {
      manifest.displayNames[category][canonical] = String(entry.name).trim();
    }
  }
}

function applySafeLedgerAliases(manifest) {
  for (const [category, aliases] of Object.entries(safeLedgerAliases)) {
    for (const [alias, target] of Object.entries(aliases)) {
      const targetKey = category === 'tokens' ? target.toUpperCase() : target;
      if (manifest[category] && manifest[category][targetKey]) {
        addAlias(manifest.aliases[category], alias, targetKey);
      }
    }
  }
}

function ensureDisplayNames(manifest) {
  for (const category of ['wallets', 'exchanges']) {
    for (const key of Object.keys(manifest[category] || {})) {
      if (!manifest.displayNames[category][key]) manifest.displayNames[category][key] = humanizeIconKey(key);
    }
  }
}

async function main() {
  // Importing the generated Web3Icons catalog once is substantially faster than
  // importing thousands of individual SVG modules. The catalog is generated
  // from Web3Icons metadata and already includes tokens, networks, wallets and
  // exchanges, including entries that intentionally reuse another icon type.
  const core = await import('@web3icons/core');
  const metadata = await import('@web3icons/common/metadata');
  const svgCatalog = core && core.svgs;
  if (!svgCatalog) throw new Error('Web3Icons catalog was not available from @web3icons/core.');

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  // Keep the wallet-aware v2 shape for backward compatibility and add exchange
  // artwork plus metadata aliases as additive fields. Display names let the
  // profile picker expose every locally available wallet icon without keeping
  // a second hand-maintained list of brand names.
  const manifest = { version: 2, tokens: {}, networks: {}, wallets: {} };
  manifest.exchanges = {};
  manifest.aliases = { tokens: {}, networks: {}, wallets: {}, exchanges: {} };
  manifest.displayNames = { wallets: {}, exchanges: {} };

  for (const category of categories) buildCategory(manifest, svgCatalog, category);
  for (const category of categories) applyMetadataAliases(manifest, metadata, category);
  applySafeLedgerAliases(manifest);
  ensureDisplayNames(manifest);

  const minimums = { tokens: 1000, networks: 100, wallets: 30, exchanges: 20 };
  for (const category of categories) {
    const count = Object.keys(manifest[category]).length;
    if (count < minimums[category]) {
      throw new Error(`SafeLedger expected the full Web3Icons ${category} catalog, but only prepared ${count}.`);
    }
  }

  for (const required of [
    ['tokens', 'BTC'], ['tokens', 'ETH'],
    ['networks', 'ethereum'], ['networks', 'binance-smart-chain'],
    ['wallets', 'coinbase'], ['wallets', 'ledger'], ['wallets', 'metamask'],
    ['exchanges', 'binance'], ['exchanges', 'kraken']
  ]) {
    const [category, key] = required;
    if (!String(manifest[category][key] || '').startsWith('data:image/')) {
      throw new Error(`SafeLedger Web3Icons preparation failed for required ${category} icon: ${key}`);
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
  console.log(
    `Prepared complete Web3Icons catalog for SafeLedger: ` +
    `${Object.keys(manifest.tokens).length} tokens, ` +
    `${Object.keys(manifest.networks).length} networks, ` +
    `${Object.keys(manifest.wallets).length} wallets, ` +
    `${Object.keys(manifest.exchanges).length} exchanges.`
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});