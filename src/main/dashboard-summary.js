'use strict';

const recoveryHealth = require('./recovery-health');
const walletCatalog = require('./wallet-catalog');
require('./wallet-catalog-extensions');

function safeName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function walletKind(group) {
  const explicit = normalize(group && group.category);
  if (explicit.includes('hardware')) return 'hardware';
  if (explicit.includes('software')) return 'software';

  const name = normalize(group && group.name);
  const catalog = (walletCatalog.catalog || []).find((item) => normalize(item && item.name) === name);
  const catalogType = normalize(catalog && catalog.type);
  if (catalogType.includes('hardware')) return 'hardware';
  if (catalogType.includes('software')) return 'software';
  return 'other';
}

function safeHealthChecks(health) {
  return (health && Array.isArray(health.checks) ? health.checks : []).map((item) => ({
    id: item.id,
    label: item.label,
    state: item.state,
    pointsEarned: item.pointsEarned,
    pointsPossible: item.pointsPossible,
    action: item.action || '',
    ageDays: Number.isFinite(item.ageDays) ? item.ageDays : null,
    thresholdDays: Number.isFinite(item.thresholdDays) ? item.thresholdDays : null,
    documentedCount: Number.isFinite(item.documentedCount) ? item.documentedCount : null,
    assetCount: Number.isFinite(item.assetCount) ? item.assetCount : null
  }));
}

function summarize(profileEntries = [], options = {}) {
  const counts = {
    profiles: profileEntries.length,
    wallets: 0,
    assets: 0,
    hardwareWallets: 0,
    softwareWallets: 0,
    otherWallets: 0,
    ready: 0,
    needsReview: 0,
    incomplete: 0
  };
  const needsAttention = [];
  const recentlyVerified = [];
  let profileReadErrors = 0;
  let scoreTotal = 0;

  for (const entry of profileEntries) {
    const profileName = safeName(entry.profileName, 'Profile');
    const profileFile = String(entry && entry.profileFile || '');
    if (entry.readError) profileReadErrors++;
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    counts.wallets += groups.length;
    for (const [walletIndex, group] of groups.entries()) {
      const walletName = safeName(group && group.name, 'Unnamed Wallet');
      counts.assets += group && Array.isArray(group.records) ? group.records.length : 0;
      const kind = walletKind(group);
      if (kind === 'hardware') counts.hardwareWallets++;
      else if (kind === 'software') counts.softwareWallets++;
      else counts.otherWallets++;

      const health = recoveryHealth.evaluateWallet(group || {}, {
        now: options.now,
        verificationDays: options.verificationDays,
        drillDays: options.drillDays,
        backupHealth: options.backupHealth
      });
      scoreTotal += health.score;
      if (health.status === 'Ready') counts.ready++;
      else if (health.status === 'Needs Review') counts.needsReview++;
      else counts.incomplete++;

      const checks = safeHealthChecks(health);
      const item = {
        profileName,
        profileFile,
        walletName,
        walletIndex,
        status: health.status,
        score: health.score,
        lastVerified: group && group.lastVerified ? String(group.lastVerified) : '',
        checks,
        actions: health.actions.map((entry) => ({ id: entry.id, action: entry.action }))
      };
      if (health.status !== 'Ready') needsAttention.push(item);
      if (item.lastVerified) recentlyVerified.push(item);
    }
  }

  needsAttention.sort((a, b) => {
    const rank = (status) => status === 'Incomplete' ? 0 : status === 'Needs Review' ? 1 : 2;
    return rank(a.status) - rank(b.status) || a.score - b.score || a.walletName.localeCompare(b.walletName);
  });
  recentlyVerified.sort((a, b) => new Date(b.lastVerified).getTime() - new Date(a.lastVerified).getTime());

  return {
    counts,
    readinessPercent: counts.wallets ? Math.round(scoreTotal / counts.wallets) : 0,
    profileReadErrors,
    needsAttention: needsAttention.slice(0, 8),
    recentlyVerified: recentlyVerified.slice(0, 6)
  };
}

exports.summarize = summarize;
exports._test = { safeName, safeHealthChecks, walletKind };
