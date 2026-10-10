'use strict';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function vaultItemKind(group = {}) {
  const category = lower(group.category);
  if (category.includes('exchange')) return 'exchange';
  if (category.includes('website') || category.includes('service')) return 'service';
  if (category.includes('hardware')) return 'hardware-wallet';
  if (category.includes('software')) return 'software-wallet';
  return 'wallet';
}

function hasRecoveryMethod(group = {}) {
  return Boolean(text(group.recoveryFormat) || text(group.recoveryStorageMode) || text(group.seedPhrase) || text(group.recoveryLink));
}

function hasRecoveryLocation(group = {}) {
  return Boolean(text(group.recoveryLocation) || text(group.backupLocation));
}

function hasInstructions(group = {}) {
  return Boolean(text(group.recoveryInstructions));
}

function locationsAppearSeparate(group = {}) {
  const primary = lower(group.recoveryLocation);
  const backup = lower(group.backupLocation);
  return Boolean(primary && backup && primary !== backup);
}

function navigationTarget(entry = {}, group = {}, profileIndex, walletIndex) {
  return Object.freeze({
    profileName: text(entry.profileName) || 'Profile',
    profileFile: text(entry.profileFile),
    profileIndex,
    walletName: text(group.name) || 'Unnamed Vault Item',
    walletIndex
  });
}

function buildResolutionTargets(profileEntries = []) {
  const targets = {
    'device-lost': null,
    'location-unavailable': null,
    'family-access': null,
    'exchange-lockout': null
  };

  for (const [profileIndex, entry] of profileEntries.entries()) {
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    for (const [walletIndex, group] of groups.entries()) {
      const target = navigationTarget(entry, group || {}, profileIndex, walletIndex);
      const method = hasRecoveryMethod(group);
      const location = hasRecoveryLocation(group);
      const instructions = hasInstructions(group);
      const kind = vaultItemKind(group);

      if (!targets['device-lost'] && (!method || !location || !instructions)) targets['device-lost'] = target;
      if (!targets['location-unavailable'] && !locationsAppearSeparate(group)) targets['location-unavailable'] = target;
      if (!targets['family-access'] && (!text(group && group.beneficiary) || !instructions || !location)) targets['family-access'] = target;
      if (!targets['exchange-lockout'] && kind === 'exchange' && !(method || instructions || text(group && group.recoveryLink))) targets['exchange-lockout'] = target;
    }
  }

  return Object.freeze(targets);
}

function buildSimulationFacts(profileEntries = []) {
  const facts = {
    profileCount: profileEntries.length,
    vaultItemCount: 0,
    assetCount: 0,
    addressCoverageCount: 0,
    methodCoverageCount: 0,
    locationCoverageCount: 0,
    instructionCoverageCount: 0,
    beneficiaryCoverageCount: 0,
    separateLocationCoverageCount: 0,
    devicePlacementCount: 0,
    exchangeCount: 0,
    exchangePlanCoverageCount: 0,
    walletCount: 0
  };

  for (const entry of profileEntries) {
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    for (const group of groups) {
      facts.vaultItemCount++;
      const kind = vaultItemKind(group);
      if (kind === 'exchange') facts.exchangeCount++;
      else facts.walletCount++;
      const method = hasRecoveryMethod(group);
      const location = hasRecoveryLocation(group);
      const instructions = hasInstructions(group);
      if (method) facts.methodCoverageCount++;
      if (location) facts.locationCoverageCount++;
      if (instructions) facts.instructionCoverageCount++;
      if (text(group && group.beneficiary)) facts.beneficiaryCoverageCount++;
      if (locationsAppearSeparate(group)) facts.separateLocationCoverageCount++;
      if (text(group && group.deviceLocation)) facts.devicePlacementCount++;
      if (kind === 'exchange' && (method || instructions || text(group && group.recoveryLink))) facts.exchangePlanCoverageCount++;

      const records = Array.isArray(group && group.records) ? group.records : [];
      facts.assetCount += records.length;
      facts.addressCoverageCount += records.reduce((count, record) => count + (text(record && record.publicAddress) ? 1 : 0), 0);
    }
  }

  return Object.freeze(facts);
}

module.exports = {
  buildSimulationFacts,
  buildResolutionTargets,
  _test: { text, lower, vaultItemKind, hasRecoveryMethod, hasRecoveryLocation, hasInstructions, locationsAppearSeparate, navigationTarget }
};
