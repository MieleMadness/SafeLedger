'use strict';

const walletCatalog = require('./wallet-catalog');
require('./wallet-catalog-extensions');
const web3Icons = require('./web3-icons');
const serviceCatalog = require('./service-catalog');
const vaultItemAssetPresets = require('./vault-item-asset-presets');

// This is the deliberate SafeLedger starter set. Wallet starters use local
// Web3Icons artwork. Chain Games is the one standard Web3-service starter and
// uses SafeLedger's local service artwork plus its reviewed CHAIN network/token
// preset. Nothing in this list adds private recovery information.
const STANDARD_STARTER_NAMES = Object.freeze([
  'Ledger',
  'Trezor',
  'MetaMask',
  'Trust Wallet',
  'Exodus',
  'Phantom',
  'Base App (Coinbase Wallet)',
  'Backpack',
  'Kraken Wallet',
  'Chain Games'
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

  // Catalog wallets retain their reviewed asset/network templates, but only
  // logo-backed catalog entries are offered in the New Profile picker.
  for (const wallet of walletCatalog.catalog || []) {
    const name = String(wallet && wallet.name || '').trim();
    if (!name) continue;
    const match = iconMatch(name);
    if (!match) continue;
    const normalized = normalizeName(name);
    templates.push({
      name,
      type: String(wallet && wallet.type || '').trim(),
      standard: standardNames.has(normalized),
      hasIcon: true,
      iconCategory: match.category,
      iconKey: match.key,
      catalog: true
    });
    claimedNames.add(normalized);
    claimedIcons.add(`${match.category}:${match.key}`);
  }

  // Chain Games is a reviewed Web3 service rather than a conventional wallet.
  // Add it to the starter picker without exposing it inside the Wallet-type
  // preset dropdown. wallet-icons.js resolves its dedicated local service art.
  for (const name of STANDARD_STARTER_NAMES) {
    const normalized = normalizeName(name);
    if (claimedNames.has(normalized)) continue;
    const service = serviceCatalog.find(name);
    if (!service) continue;
    if (!vaultItemAssetPresets.hasAssetPreset(service.name, vaultItemAssetPresets.WEB3_CATEGORY)) continue;
    templates.push({
      name: service.name,
      type: '',
      standard: true,
      hasIcon: false,
      service: true,
      category: vaultItemAssetPresets.WEB3_CATEGORY,
      catalog: false
    });
    claimedNames.add(normalized);
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
    return wallet && wallet.standard === true;
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

    const service = serviceCatalog.find(name);
    if (service && vaultItemAssetPresets.hasAssetPreset(service.name, vaultItemAssetPresets.WEB3_CATEGORY)) {
      return {
        name: service.name,
        category: vaultItemAssetPresets.WEB3_CATEGORY,
        created: today,
        notes: 'Web3 account starter template with SafeLedger-reviewed Chain Games network/token entries. Add your own account and recovery details.',
        records: vaultItemAssetPresets.buildRecords(service.name, vaultItemAssetPresets.WEB3_CATEGORY, today)
      };
    }

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
