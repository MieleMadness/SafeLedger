'use strict';

const recoveryReadiness = require('./recovery-readiness');

function safeName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function summarize(profileEntries = []) {
  const counts = { profiles: profileEntries.length, wallets: 0, assets: 0, ready: 0, needsReview: 0, incomplete: 0 };
  const needsAttention = [];
  const recentlyVerified = [];
  let profileReadErrors = 0;

  for (const entry of profileEntries) {
    const profileName = safeName(entry.profileName, 'Profile');
    if (entry.readError) profileReadErrors++;
    const groups = entry && entry.vaultData && Array.isArray(entry.vaultData.groups) ? entry.vaultData.groups : [];
    counts.wallets += groups.length;
    for (const group of groups) {
      const walletName = safeName(group && group.name, 'Unnamed Wallet');
      counts.assets += group && Array.isArray(group.records) ? group.records.length : 0;
      const readiness = recoveryReadiness.calculateWalletReadiness(group || {});
      if (readiness.status === 'Ready') counts.ready++;
      else if (readiness.status === 'Needs Review') counts.needsReview++;
      else counts.incomplete++;

      const item = {
        profileName,
        walletName,
        status: readiness.status,
        score: readiness.score,
        lastVerified: group && group.lastVerified ? String(group.lastVerified) : ''
      };
      if (readiness.status !== 'Ready') needsAttention.push(item);
      if (item.lastVerified) recentlyVerified.push(item);
    }
  }

  needsAttention.sort((a, b) => {
    const rank = (status) => status === 'Incomplete' ? 0 : status === 'Needs Review' ? 1 : 2;
    return rank(a.status) - rank(b.status) || a.walletName.localeCompare(b.walletName);
  });
  recentlyVerified.sort((a, b) => new Date(b.lastVerified).getTime() - new Date(a.lastVerified).getTime());

  const readinessPercent = counts.wallets
    ? Math.round(((counts.ready * 100) + (counts.needsReview * 60)) / counts.wallets)
    : 0;

  return {
    counts,
    readinessPercent,
    profileReadErrors,
    needsAttention: needsAttention.slice(0, 8),
    recentlyVerified: recentlyVerified.slice(0, 6)
  };
}

exports.summarize = summarize;
exports._test = { safeName };
