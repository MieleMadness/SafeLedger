'use strict';

const walletCatalog = require('./wallet-catalog');

const normalize = (value) => String(value || '').trim().toLowerCase();
const originalBuildDefaultGroups = walletCatalog.buildDefaultGroups;

function catalogCategory(wallet) {
  return wallet && wallet.type ? `${wallet.type} Wallet` : '';
}

function cleanBuiltGroups(groups) {
  return (groups || []).map((group) => {
    const catalogWallet = walletCatalog.catalog.find((wallet) => normalize(wallet.name) === normalize(group.name));
    return Object.assign({}, group, {
      category: group.category || catalogCategory(catalogWallet),
      notes: '',
      records: (group.records || []).map((record) => Object.assign({}, record, { notes: '' }))
    });
  });
}

// main.js imports this module before creating new vaults. Wrapping the catalog
// builder here keeps catalog/support metadata out of user-owned Notes fields
// without changing the legacy vault format.
walletCatalog.buildDefaultGroups = (today) => cleanBuiltGroups(originalBuildDefaultGroups(today));

function cloneRecord(record, today) {
  return {
    name: record.name,
    symbol: record.symbol || '',
    created: today,
    notes: ''
  };
}

function recordMatches(existing, catalogRecord) {
  const existingSymbol = normalize(existing.symbol);
  const catalogSymbol = normalize(catalogRecord.symbol);
  if (existingSymbol && catalogSymbol && existingSymbol === catalogSymbol) return true;
  return normalize(existing.name) === normalize(catalogRecord.name);
}

function clearCatalogGeneratedNotes(wallet, catalogWallet) {
  const generatedWalletNote = `${catalogWallet.type} wallet. Support catalog reviewed 2026-08-19. Source: ${catalogWallet.source}`;
  if (wallet.notes === generatedWalletNote) wallet.notes = '';

  const catalogNotes = new Set(catalogWallet.records.map((entry) => entry[2]).filter(Boolean));
  if (Array.isArray(wallet.records)) {
    for (const record of wallet.records) {
      if (catalogNotes.has(record.notes)) record.notes = '';
    }
  }
}

exports.mergeCatalog = (vaultData) => {
  const today = Date();
  const result = {
    addedWallets: 0,
    addedRecords: 0,
    untouchedWallets: 0,
    catalogVersion: '2026-08-20'
  };

  if (!vaultData || typeof vaultData !== 'object') throw new Error('No vault is currently loaded.');
  if (!Array.isArray(vaultData.groups)) vaultData.groups = [];

  for (const catalogWallet of walletCatalog.catalog) {
    let existingWallet = vaultData.groups.find((group) => normalize(group.name) === normalize(catalogWallet.name));

    if (!existingWallet) {
      existingWallet = {
        name: catalogWallet.name,
        category: catalogCategory(catalogWallet),
        created: today,
        notes: '',
        records: catalogWallet.records.map(([name, symbol]) => cloneRecord({ name, symbol }, today))
      };
      vaultData.groups.push(existingWallet);
      result.addedWallets++;
      result.addedRecords += existingWallet.records.length;
      continue;
    }

    existingWallet.category = existingWallet.category || catalogCategory(catalogWallet);
    clearCatalogGeneratedNotes(existingWallet, catalogWallet);

    if (!Array.isArray(existingWallet.records)) existingWallet.records = [];
    let addedToWallet = 0;

    for (const [name, symbol] of catalogWallet.records) {
      const catalogRecord = { name, symbol };
      const exists = existingWallet.records.some((record) => recordMatches(record, catalogRecord));
      if (!exists) {
        existingWallet.records.push(cloneRecord(catalogRecord, today));
        result.addedRecords++;
        addedToWallet++;
      }
    }

    if (addedToWallet === 0) result.untouchedWallets++;
    existingWallet.records.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  }

  vaultData.groups.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  vaultData.catalogVersion = result.catalogVersion;
  vaultData.catalogUpdated = new Date().toISOString();
  return result;
};
