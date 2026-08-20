'use strict';

const walletCatalog = require('./wallet-catalog');

const normalize = (value) => String(value || '').trim().toLowerCase();

function cloneRecord(record, today) {
  return {
    name: record.name,
    symbol: record.symbol || '',
    created: today,
    notes: record.notes || ''
  };
}

function recordMatches(existing, catalogRecord) {
  const existingSymbol = normalize(existing.symbol);
  const catalogSymbol = normalize(catalogRecord.symbol);
  if (existingSymbol && catalogSymbol && existingSymbol === catalogSymbol) return true;
  return normalize(existing.name) === normalize(catalogRecord.name);
}

exports.mergeCatalog = (vaultData) => {
  const today = Date();
  const result = {
    addedWallets: 0,
    addedRecords: 0,
    untouchedWallets: 0,
    catalogVersion: '2026-08-19'
  };

  if (!vaultData || typeof vaultData !== 'object') throw new Error('No vault is currently loaded.');
  if (!Array.isArray(vaultData.groups)) vaultData.groups = [];

  for (const catalogWallet of walletCatalog.catalog) {
    let existingWallet = vaultData.groups.find((group) => normalize(group.name) === normalize(catalogWallet.name));

    if (!existingWallet) {
      existingWallet = {
        name: catalogWallet.name,
        created: today,
        notes: `${catalogWallet.type} wallet. Support catalog reviewed 2026-08-19. Source: ${catalogWallet.source}`,
        records: catalogWallet.records.map(([name, symbol, notes]) => cloneRecord({ name, symbol, notes }, today))
      };
      vaultData.groups.push(existingWallet);
      result.addedWallets++;
      result.addedRecords += existingWallet.records.length;
      continue;
    }

    if (!Array.isArray(existingWallet.records)) existingWallet.records = [];
    let addedToWallet = 0;

    for (const [name, symbol, notes] of catalogWallet.records) {
      const catalogRecord = { name, symbol, notes };
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
