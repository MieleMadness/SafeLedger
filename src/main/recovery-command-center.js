'use strict';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function iso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function event(events, timestamp, kind, title, detail, target = {}) {
  const at = iso(timestamp);
  if (!at) return;
  events.push(Object.freeze({
    timestamp: at,
    kind,
    title,
    detail,
    profileIndex: Number.isInteger(target.profileIndex) ? target.profileIndex : null,
    profileFile: text(target.profileFile),
    walletIndex: Number.isInteger(target.walletIndex) ? target.walletIndex : null,
    recordIndex: Number.isInteger(target.recordIndex) ? target.recordIndex : null
  }));
}

function buildSecurityTimeline(profileEntries = [], limit = 16) {
  const events = [];
  for (const [profileIndex, entry] of profileEntries.entries()) {
    const profile = entry && entry.profile ? entry.profile : {};
    const profileName = text(entry && entry.profileName) || text(profile.name) || 'Profile';
    const profileFile = text(entry && entry.profileFile) || text(profile.file);
    const profileTarget = { profileIndex, profileFile };
    event(events, profile.created, 'profile-created', 'Profile created', profileName, profileTarget);
    event(events, profile.modified, 'profile-updated', 'Profile updated', profileName, profileTarget);

    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    for (const [walletIndex, group] of groups.entries()) {
      const walletName = text(group && group.name) || 'Vault Item';
      const target = { profileIndex, profileFile, walletIndex };
      event(events, group && group.created, 'vault-item-created', 'Vault Item added', `${walletName} · ${profileName}`, target);
      event(events, group && group.modified, 'vault-item-updated', 'Vault Item updated', `${walletName} · ${profileName}`, target);
      event(events, group && group.lastVerified, 'recovery-verified', 'Recovery information verified', `${walletName} · ${profileName}`, target);
      event(events, group && group.lastRecoveryDrill, 'recovery-drill', 'Recovery Validation completed', `${walletName} · ${profileName}`, target);

      const records = Array.isArray(group && group.records) ? group.records : [];
      for (const [recordIndex, record] of records.entries()) {
        const assetName = text(record && record.name) || text(record && record.symbol) || 'Asset';
        const assetTarget = Object.assign({}, target, { recordIndex });
        event(events, record && record.created, 'asset-created', 'Asset added', `${assetName} · ${walletName}`, assetTarget);
        event(events, record && record.modified, 'asset-updated', 'Asset updated', `${assetName} · ${walletName}`, assetTarget);
      }
    }
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const max = Math.max(1, Math.min(50, Number.parseInt(limit, 10) || 16));
  return events.slice(0, max);
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

function buildSimulationFacts(profileEntries = []) {
  const facts = {
    profileCount: profileEntries.length,
    vaultItemCount: 0,
    assetCount: 0,
    addressDocumentedCount: 0,
    recoveryMethodCount: 0,
    recoveryLocationCount: 0,
    recoveryInstructionCount: 0,
    beneficiaryCount: 0,
    separateLocationCount: 0,
    deviceLocationCount: 0,
    exchangeCount: 0,
    exchangeRecoveryPlanCount: 0,
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
      if (method) facts.recoveryMethodCount++;
      if (location) facts.recoveryLocationCount++;
      if (instructions) facts.recoveryInstructionCount++;
      if (text(group && group.beneficiary)) facts.beneficiaryCount++;
      if (locationsAppearSeparate(group)) facts.separateLocationCount++;
      if (text(group && group.deviceLocation)) facts.deviceLocationCount++;
      if (kind === 'exchange' && (method || instructions || text(group && group.recoveryLink))) facts.exchangeRecoveryPlanCount++;

      const records = Array.isArray(group && group.records) ? group.records : [];
      facts.assetCount += records.length;
      facts.addressDocumentedCount += records.reduce((count, record) => count + (text(record && record.publicAddress) ? 1 : 0), 0);
    }
  }

  return Object.freeze(facts);
}

module.exports = {
  buildSecurityTimeline,
  buildSimulationFacts,
  _test: { text, lower, iso, event, vaultItemKind, hasRecoveryMethod, hasRecoveryLocation, hasInstructions, locationsAppearSeparate }
};