'use strict';

const recoveryHealth = require('./recovery-health');

const REVIEW_DAYS = recoveryHealth.DEFAULT_VERIFICATION_DAYS;

function text(value) { return String(value || '').trim(); }
function hasRecoveryPlan(group = {}) {
  return Boolean(
    recoveryHealth.hasRecoveryMethod(group) ||
    recoveryHealth.hasRecoveryLocation(group) ||
    recoveryHealth.hasInstructions(group) ||
    text(group.backupLocation)
  );
}
function daysSince(value, now = Date.now()) { return recoveryHealth.daysSince(value, now); }
function calculateWalletReadiness(group = {}, now = Date.now()) {
  const health = recoveryHealth.evaluateWallet(group, { now });
  const verifiedDaysAgo = daysSince(group.lastVerified, now);
  const verified = verifiedDaysAgo !== null;
  const verificationCurrent = verified && verifiedDaysAgo <= REVIEW_DAYS;
  const message = health.actions.length
    ? health.actions[0].action
    : 'Recovery information is documented, current, and ready for periodic review.';
  return {
    status: health.status,
    score: health.score,
    recoveryDocumented: hasRecoveryPlan(group),
    verified,
    verificationCurrent,
    verifiedDaysAgo,
    reviewDays: REVIEW_DAYS,
    message,
    checks: health.checks,
    actions: health.actions
  };
}
exports.REVIEW_DAYS = REVIEW_DAYS;
exports.hasRecoveryPlan = hasRecoveryPlan;
exports.daysSince = daysSince;
exports.calculateWalletReadiness = calculateWalletReadiness;
