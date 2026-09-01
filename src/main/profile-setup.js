'use strict';

const walletCatalog = require('./wallet-catalog');

// These are the wallets SafeLedger currently includes in its automatic
// starter profile. They remain the preselected "standard" choices, while every
// wallet in the catalog is available for a user to opt into explicitly.
const standardExclusions = new Set([
  'bitbox02 multi',
  'coldcard',
  'keystone',
  'rabby wallet'
]);

const normalizeName = (value) => String(value || '').trim().toLowerCase();

function availableTemplates() {
  return (walletCatalog.catalog || []).map((wallet) => ({
    name: String(wallet && wallet.name || '').trim(),
    type: String(wallet && wallet.type || '').trim(),
    standard: !standardExclusions.has(normalizeName(wallet && wallet.name))
  })).filter((wallet) => wallet.name);
}

function standardNames() {
  return availableTemplates().filter((wallet) => wallet.standard).map((wallet) => wallet.name);
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
  const selected = new Set(resolveNames(walletNames));
  if (!selected.size) return [];
  return walletCatalog.buildDefaultGroups(today).filter((group) => selected.has(String(group && group.name || '')));
}

exports.availableTemplates = availableTemplates;
exports.standardNames = standardNames;
exports.resolveNames = resolveNames;
exports.unknownNames = unknownNames;
exports.buildGroups = buildGroups;
exports.normalizeName = normalizeName;
