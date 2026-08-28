'use strict';

const customFields = require('./custom-fields');

const MAX_RESULTS = 50;
const MIN_QUERY_LENGTH = 2;

function text(value) {
  return String(value == null ? '' : value).trim();
}

function normalize(value) {
  return text(value).toLowerCase();
}

function buildIndex(entries = []) {
  const index = [];
  for (const entry of entries) {
    const profile = entry && entry.profile || {};
    const vaultData = entry && entry.vaultData || {};
    const profileName = text(profile.name) || 'Profile';
    const profileFile = text(profile.file);
    if (!profileFile) continue;

    index.push({
      type: 'profile',
      title: profileName,
      subtitle: 'Profile',
      profileName,
      profileFile,
      pinned: profile.pinned === true,
      searchText: normalize(profileName)
    });

    const groups = Array.isArray(vaultData.groups) ? vaultData.groups : [];
    groups.forEach((wallet, walletIndex) => {
      const walletName = text(wallet && wallet.name) || 'Wallet';
      const category = text(wallet && wallet.category);
      const walletSearch = [
        profileName,
        walletName,
        category,
        wallet && wallet.manufacturer,
        wallet && wallet.model,
        wallet && wallet.recoveryFormat,
        wallet && wallet.tags,
        ...customFields.searchableValues(wallet && wallet.customFields)
      ];
      index.push({
        type: 'wallet',
        title: walletName,
        subtitle: [profileName, category].filter(Boolean).join(' · '),
        profileName,
        profileFile,
        walletIndex,
        pinned: wallet && wallet.pinned === true,
        searchText: walletSearch.map(normalize).filter(Boolean).join(' ')
      });

      const records = Array.isArray(wallet && wallet.records) ? wallet.records : [];
      records.forEach((asset, recordIndex) => {
        const assetName = text(asset && asset.name) || 'Asset';
        const symbol = text(asset && asset.symbol).toUpperCase();
        const assetSearch = [
          profileName,
          walletName,
          assetName,
          symbol,
          asset && asset.publicAddress,
          asset && asset.tags,
          ...customFields.searchableValues(asset && asset.customFields)
        ];
        index.push({
          type: 'asset',
          title: assetName,
          subtitle: [symbol, walletName, profileName].filter(Boolean).join(' · '),
          profileName,
          profileFile,
          walletIndex,
          recordIndex,
          pinned: asset && asset.pinned === true,
          searchText: assetSearch.map(normalize).filter(Boolean).join(' ')
        });
      });
    });
  }
  return index;
}

function resultView(item) {
  const result = {
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    profileName: item.profileName,
    profileFile: item.profileFile,
    pinned: item.pinned === true
  };
  if (Number.isInteger(item.walletIndex)) result.walletIndex = item.walletIndex;
  if (Number.isInteger(item.recordIndex)) result.recordIndex = item.recordIndex;
  return result;
}

function search(entries, query, limit = MAX_RESULTS) {
  const needle = normalize(query).slice(0, 120);
  if (needle.length < MIN_QUERY_LENGTH) return [];
  const safeLimit = Math.max(1, Math.min(MAX_RESULTS, Number.parseInt(limit, 10) || MAX_RESULTS));
  return buildIndex(entries)
    .filter((item) => item.searchText.includes(needle))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aStarts = normalize(a.title).startsWith(needle);
      const bStarts = normalize(b.title).startsWith(needle);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      const typeOrder = { profile: 0, wallet: 1, asset: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return normalize(a.title).localeCompare(normalize(b.title));
    })
    .slice(0, safeLimit)
    .map(resultView);
}

module.exports = {
  MAX_RESULTS,
  MIN_QUERY_LENGTH,
  buildIndex,
  search,
  _test: { normalize, resultView }
};
