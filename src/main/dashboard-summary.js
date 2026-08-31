'use strict';

const recoveryHealth = require('./recovery-health');

function safeName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
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
  const counts = { profiles: profileEntries.length, wallets: 0, assets: 0, ready: 0, needsReview: 0, incomplete: 0 };
  const needsAttention = [];
  const recentlyVerified = [];
  let profileReadErrors = 0;
  let scoreTotal = 0;

  for (const entry of profileEntries) {
    const profileName = safeName(entry.profileName, 'Profile');
    if (entry.readError) profileReadErrors++;
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    counts.wallets += groups.length;
    for (const group of groups) {
      const walletName = safeName(group && group.name, 'Unnamed Wallet');
      counts.assets += group && Array.isArray(group.records) ? group.records.length : 0;
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
        walletName,
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
exports._test = { safeName, safeHealthChecks };
