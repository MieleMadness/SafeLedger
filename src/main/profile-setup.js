'use strict';

const walletCatalog = require('./wallet-catalog');
require('./wallet-catalog-extensions');
const web3Icons = require('./web3-icons');

// This is the deliberate SafeLedger starter set. A wallet is only preselected
// when SafeLedger also has real local brand artwork for it. The picker itself
// remains broader: all established catalog wallets stay available, and every
// wallet represented in the local Web3Icons wallet catalog is added as an
// optional choice.
const STANDARD_STARTER_NAMES = Object.freeze([
  'Ledger',
  'Trezor',
  'MetaMask',
  'Trust Wallet',
  'Exodus',
  'Phantom',
  'Base App (Coinbase Wallet)',
  'Backpack',
  'Kraken Wallet'
]);

const normalizeName = (value) => String(value || '').trim().toLowerCase();

function iconMatch(name) {
  return web3Icons.matchFirst([
    { category: 'wallets', values: [name] },
    { category: 'exchanges', values: [name] }
  ]);
}

function availableTemplates() {
  const templates = [];
  const claimedIcons = new Set();
  const claimedNames = new Set();
  const standardNames = new Set(STANDARD_STARTER_NAMES.map(normalizeName));

  // Preserve every SafeLedger catalog wallet as an optional template. Catalog
  // wallets know which assets/networks to seed. Only icon-backed entries can be
  // part of the automatic Standard setup.
  for (const wallet of walletCatalog.catalog || []) {
    const name = String(wallet && wallet.name || '').trim();
    if (!name) continue;
    const match = iconMatch(name);
    const normalized = normalizeName(name);
    templates.push({
      name,
      type: String(wallet && wallet.type || '').trim(),
      standard: !!match && standardNames.has(normalized),
      hasIcon: !!match,
      iconCategory: match ? match.category : '',
      iconKey: match ? match.key : '',
      catalog: true
    });
    claimedNames.add(normalized);
    if (match) claimedIcons.add(`${match.category}:${match.key}`);
  }

  // Add every wallet represented by the pinned local Web3Icons wallet catalog.
  // These icon-only choices intentionally start with no seeded assets because
  // SafeLedger has not reviewed a network-support catalog for them yet.
  for (const entry of web3Icons.entries('wallets')) {
    const iconId = `wallets:${entry.key}`;
    const normalized = normalizeName(entry.name);
    if (!entry.name || claimedIcons.has(iconId) || claimedNames.has(normalized)) continue;
    templates.push({
      name: entry.name,
      type: '',
      standard: false,
      hasIcon: true,
      iconCategory: 'wallets',
      iconKey: entry.key,
      catalog: false
    });
    claimedIcons.add(iconId);
    claimedNames.add(normalized);
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function standardNames() {
  const available = new Map(availableTemplates().map((wallet) => [normalizeName(wallet.name), wallet]));
  return STANDARD_STARTER_NAMES.filter((name) => {
    const wallet = available.get(normalizeName(name));
    return wallet && wallet.standard === true && wallet.hasIcon === true;
  });
}

function resolveNames(values) {
  if (!Array.isArray(values)) return [];
  const byName = new Map(availableTemplates().map((wallet) => [normalizeName(wallet.name), wallet.name]));
  const resolved = [];
  const seen = new Set();
  for (const value of values) {
    const key = normalizeName(value);
    const canonical = byName.get(key);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    resolved.push(canonical);
  }
  return resolved;
}

function unknownNames(values) {
  if (!Array.isArray(values)) return [];
  const known = new Set(availableTemplates().map((wallet) => normalizeName(wallet.name)));
  return [...new Set(values.map(normalizeName).filter(Boolean).filter((name) => !known.has(name)))];
}

function buildGroups(today, walletNames) {
  const selectedNames = resolveNames(walletNames);
  if (!selectedNames.length) return [];

  const catalogGroups = new Map(walletCatalog.buildDefaultGroups(today)
    .map((group) => [normalizeName(group && group.name), group]));

  return selectedNames.map((name) => {
    const catalogGroup = catalogGroups.get(normalizeName(name));
    if (catalogGroup) return catalogGroup;
    return {
      name,
      created: today,
      notes: 'Wallet template with local SafeLedger brand artwork. Add the assets and networks you use for this wallet manually.',
      records: []
    };
  });
}

exports.STANDARD_STARTER_NAMES = STANDARD_STARTER_NAMES;
exports.availableTemplates = availableTemplates;
exports.standardNames = standardNames;
exports.resolveNames = resolveNames;
exports.unknownNames = unknownNames;
exports.buildGroups = buildGroups;
exports.normalizeName = normalizeName;
exports.iconMatch = iconMatch;
