'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'node_modules', '@web3icons', 'core', 'dist', 'svgs');
const outputRoot = path.join(projectRoot, 'src', 'main', 'assets', 'token-icons');
const manifestPath = path.join(outputRoot, 'manifest.json');

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

const walletAliases = {
  'base-app': 'coinbase',
  'base-app-coinbase-wallet': 'coinbase',
  'coinbase-wallet': 'coinbase',
  'bitbox02': 'bitbox',
  'bitbox02-multi': 'bitbox',
  'rabby-wallet': 'rabby'
};

const cleanSymbol = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
const slug = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

function toDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

function normalizeIconSource(value, modulePath) {
  if (!value) return null;
  if (typeof value === 'object') return normalizeIconSource(value.default || value.src, modulePath);
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
  if (fs.existsSync(base)) {
    const contents = fs.readFileSync(base, 'utf8');
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

function availableIconNames(type) {
  const names = new Set();
  for (const variant of ['branded', 'background', 'mono']) {
    const folder = path.join(sourceRoot, type, variant);
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder)) {
      const match = file.match(/^(.+?)\.svg(?:\.js)?$/i);
      if (match) names.add(match[1]);
    }
  }
  return names;
}

function iconRef(type, name) {
  const singular = type === 'tokens' ? 'token' : type === 'networks' ? 'network' : type === 'wallets' ? 'wallet' : type;
  return `${singular}:${name}`;
}

function parseIconRef(ref) {
  const match = /^(token|network|wallet):(.+)$/.exec(String(ref || ''));
  if (!match) return null;
  const type = match[1] === 'token' ? 'tokens' : match[1] === 'network' ? 'networks' : 'wallets';
  return { type, name: match[2], ref: `${match[1]}:${match[2]}` };
}

function metadataRef(entry, fallbackType, fallbackName) {
  const parsed = parseIconRef(entry && entry.filePath);
  return parsed ? parsed.ref : iconRef(fallbackType, fallbackName);
}

async function loadMetadata(specifier, exportName) {
  const imported = await import(specifier);
  const value = imported[exportName] || (imported.default && imported.default[exportName]) || imported.default;
  if (!Array.isArray(value)) throw new Error(`Web3Icons metadata export ${exportName} was unavailable from ${specifier}.`);
  return value;
}

async function runPool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) return;
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
}

function register(map, key, ref, icons) {
  if (!key || !ref || !icons[ref] || map[key]) return;
  map[key] = ref;
}

function copyAlias(map, alias, target) {
  if (map[target] && !map[alias]) map[alias] = map[target];
}

async function main() {
  if (!fs.existsSync(sourceRoot)) throw new Error(`Web3Icons SVG directory was not found: ${sourceRoot}`);

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const [tokenMetadata, networkMetadata, walletMetadata] = await Promise.all([
    loadMetadata('@web3icons/common/metadata/tokens', 'tokens'),
    loadMetadata('@web3icons/common/metadata/networks', 'networks'),
    loadMetadata('@web3icons/common/metadata/wallets', 'wallets')
  ]);

  const physical = {
    tokens: availableIconNames('tokens'),
    networks: availableIconNames('networks'),
    wallets: availableIconNames('wallets')
  };

  const refs = new Set();
  for (const [type, names] of Object.entries(physical)) {
    for (const name of names) refs.add(iconRef(type, name));
  }
  for (const entry of tokenMetadata) refs.add(metadataRef(entry, 'tokens', entry.symbol || entry.id));
  for (const entry of networkMetadata) refs.add(metadataRef(entry, 'networks', entry.id || entry.name));
  for (const entry of walletMetadata) refs.add(metadataRef(entry, 'wallets', entry.id || entry.name));

  const manifest = {
    version: 3,
    icons: {},
    tokens: {},
    tokenNames: {},
    networks: {},
    wallets: {}
  };

  await runPool([...refs].sort(), 24, async (ref) => {
    const parsed = parseIconRef(ref);
    if (!parsed) return;
    const source = await loadBestIcon(parsed.type, parsed.name);
    if (source) manifest.icons[parsed.ref] = source;
  });

  for (const name of physical.tokens) register(manifest.tokens, cleanSymbol(name), iconRef('tokens', name), manifest.icons);
  for (const name of physical.networks) register(manifest.networks, slug(name), iconRef('networks', name), manifest.icons);
  for (const name of physical.wallets) register(manifest.wallets, slug(name), iconRef('wallets', name), manifest.icons);

  for (const entry of tokenMetadata) {
    const ref = metadataRef(entry, 'tokens', entry.symbol || entry.id);
    register(manifest.tokens, cleanSymbol(entry.symbol), ref, manifest.icons);
    register(manifest.tokenNames, slug(entry.name), ref, manifest.icons);
    register(manifest.tokenNames, slug(entry.id), ref, manifest.icons);
  }

  for (const entry of networkMetadata) {
    const ref = metadataRef(entry, 'networks', entry.id || entry.name);
    register(manifest.networks, slug(entry.id), ref, manifest.icons);
    register(manifest.networks, slug(entry.name), ref, manifest.icons);
    register(manifest.networks, slug(entry.shortName), ref, manifest.icons);
  }

  for (const entry of walletMetadata) {
    const ref = metadataRef(entry, 'wallets', entry.id || entry.name);
    register(manifest.wallets, slug(entry.id), ref, manifest.icons);
    register(manifest.wallets, slug(entry.name), ref, manifest.icons);
  }

  for (const [alias, target] of Object.entries(standardNetworkAliases)) copyAlias(manifest.networks, alias, target);
  for (const [alias, target] of Object.entries(walletAliases)) copyAlias(manifest.wallets, alias, target);

  if (!manifest.tokens.BTC) {
    throw new Error('SafeLedger icon preparation failed: BTC artwork was not found. Build stopped to prevent an iconless release.');
  }
  if (!manifest.wallets.ledger || !manifest.wallets.metamask) {
    throw new Error('SafeLedger icon preparation failed: core wallet artwork was not found. Build stopped to prevent an incomplete wallet-icon release.');
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf8');
  console.log(
    `Prepared ${Object.keys(manifest.icons).length} unique Web3Icons artworks with ` +
    `${Object.keys(manifest.tokens).length} token-symbol triggers, ` +
    `${Object.keys(manifest.tokenNames).length} token-name triggers, ` +
    `${Object.keys(manifest.networks).length} network-name triggers, and ` +
    `${Object.keys(manifest.wallets).length} wallet-name triggers for SafeLedger.`
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
