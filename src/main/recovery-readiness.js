'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_DAYS = 365;

function text(value) { return String(value || '').trim(); }
function parseDate(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
function hasRecoveryPlan(group = {}) {
  return Boolean(text(group.seedPhrase) || text(group.recoveryLink) || text(group.recoveryLocation) || text(group.backupLocation) || text(group.recoveryInstructions));
}
function daysSince(value, now = Date.now()) { const date = parseDate(value); if (!date) return null; return Math.max(0, Math.floor((Number(now) - date.getTime()) / DAY_MS)); }
function calculateWalletReadiness(group = {}, now = Date.now()) {
  const recoveryDocumented = hasRecoveryPlan(group);
  const verifiedDaysAgo = daysSince(group.lastVerified, now);
  const verified = verifiedDaysAgo !== null;
  const verificationCurrent = verified && verifiedDaysAgo <= REVIEW_DAYS;
  let score = 0;
  if (recoveryDocumented) score += 55;
  if (verified) score += 25;
  if (verificationCurrent) score += 20;
  let status = 'Incomplete';
  let message = 'Add recovery information or document where recovery material is stored.';
  if (recoveryDocumented && verificationCurrent) {
    status = 'Ready';
    message = 'Recovery information is documented and has been verified within the last year.';
  } else if (recoveryDocumented) {
    status = 'Needs Review';
    message = verified ? 'Recovery information is documented, but the verification is more than one year old.' : 'Recovery information is documented. Verify it to confirm it is still current.';
  }
  return { status, score, recoveryDocumented, verified, verificationCurrent, verifiedDaysAgo, reviewDays: REVIEW_DAYS, message };
}
exports.REVIEW_DAYS = REVIEW_DAYS;
exports.hasRecoveryPlan = hasRecoveryPlan;
exports.daysSince = daysSince;
exports.calculateWalletReadiness = calculateWalletReadiness;
