'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_VERIFICATION_DAYS = 365;
const DEFAULT_DRILL_DAYS = 365;

function text(value) {
  return String(value || '').trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDays(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 3650 ? parsed : fallback;
}

function daysSince(value, now = Date.now()) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Number(now) - date.getTime()) / DAY_MS));
}

function hasRecoveryMethod(group = {}) {
  return Boolean(
    text(group.recoveryFormat) ||
    text(group.recoveryStorageMode) ||
    text(group.seedPhrase) ||
    text(group.recoveryLink)
  );
}

function hasRecoveryLocation(group = {}) {
  return Boolean(text(group.recoveryLocation) || text(group.backupLocation));
}

function hasInstructions(group = {}) {
  return Boolean(text(group.recoveryInstructions));
}

function addressCoverage(group = {}) {
  const records = Array.isArray(group.records) ? group.records : [];
  if (!records.length) return { applicable: false, total: 0, documented: 0 };
  const documented = records.reduce((count, record) => count + (text(record && record.publicAddress) ? 1 : 0), 0);
  return { applicable: true, total: records.length, documented };
}

function check(id, label, state, pointsEarned, pointsPossible, action, extra) {
  return Object.freeze(Object.assign({
    id,
    label,
    state,
    pointsEarned,
    pointsPossible,
    action
  }, extra || {}));
}

function datedCheck({ id, label, value, now, thresholdDays, points, missingAction, staleAction }) {
  const ageDays = daysSince(value, now);
  if (ageDays === null) return check(id, label, 'incomplete', 0, points, missingAction, { ageDays: null, thresholdDays });
  if (ageDays <= thresholdDays) return check(id, label, 'pass', points, points, '', { ageDays, thresholdDays });
  return check(id, label, 'review', Math.round(points * 0.4), points, staleAction, { ageDays, thresholdDays });
}

function backupCheck(backupHealth) {
  const points = 10;
  if (!backupHealth) return check(
    'verified-backup',
    'Verified encrypted backup',
    'not-applicable',
    0,
    0,
    ''
  );
  const verified = backupHealth.verified || null;
  const hasCreatedAt = Boolean(parseDate(backupHealth.verifiedBackupCreatedAt));
  if (verified && verified.state === 'current' && hasCreatedAt) {
    return check('verified-backup', 'Verified encrypted backup', 'pass', points, points, '');
  }
  if (verified && verified.state === 'due') {
    return check('verified-backup', 'Verified encrypted backup', 'review', 4, points, 'Verify a current encrypted backup.');
  }
  return check('verified-backup', 'Verified encrypted backup', 'incomplete', 0, points, 'Create and verify an encrypted backup stored separately from the working copy.');
}

function evaluateWallet(group = {}, context = {}) {
  const now = Number(context.now == null ? Date.now() : context.now);
  const verificationDays = normalizeDays(context.verificationDays, DEFAULT_VERIFICATION_DAYS);
  const drillDays = normalizeDays(context.drillDays, DEFAULT_DRILL_DAYS);
  const checks = [];

  checks.push(hasRecoveryMethod(group)
    ? check('recovery-method', 'Recovery method documented', 'pass', 20, 20, '')
    : check('recovery-method', 'Recovery method documented', 'incomplete', 0, 20, 'Document the recovery method or where recovery material is accessed.'));

  checks.push(hasRecoveryLocation(group)
    ? check('recovery-location', 'Recovery location documented', 'pass', 15, 15, '')
    : check('recovery-location', 'Recovery location documented', 'incomplete', 0, 15, 'Document where the recovery material or backup is stored.'));

  checks.push(hasInstructions(group)
    ? check('instructions', 'Recovery instructions documented', 'pass', 15, 15, '')
    : check('instructions', 'Recovery instructions documented', 'incomplete', 0, 15, 'Add instructions that explain how to perform recovery.'));

  const coverage = addressCoverage(group);
  if (!coverage.applicable) {
    checks.push(check('public-addresses', 'Public addresses documented', 'not-applicable', 0, 0, '', { documentedCount: 0, assetCount: 0 }));
  } else if (coverage.documented === coverage.total) {
    checks.push(check('public-addresses', 'Public addresses documented', 'pass', 10, 10, '', { documentedCount: coverage.documented, assetCount: coverage.total }));
  } else if (coverage.documented > 0) {
    checks.push(check('public-addresses', 'Public addresses documented', 'review', 5, 10, 'Review Assets that do not yet have a public address documented.', { documentedCount: coverage.documented, assetCount: coverage.total }));
  } else {
    checks.push(check('public-addresses', 'Public addresses documented', 'incomplete', 0, 10, 'Document public addresses for Assets where an address is relevant.', { documentedCount: 0, assetCount: coverage.total }));
  }

  checks.push(datedCheck({
    id: 'verification',
    label: 'Recovery information verified',
    value: group.lastVerified,
    now,
    thresholdDays: verificationDays,
    points: 15,
    missingAction: 'Verify the documented recovery information.',
    staleAction: 'Verify the recovery information again because the prior verification is out of date.'
  }));

  checks.push(datedCheck({
    id: 'recovery-drill',
    label: 'Test recovery completed',
    value: group.lastRecoveryDrill,
    now,
    thresholdDays: drillDays,
    points: 15,
    missingAction: 'Run a non-destructive Test Recovery.',
    staleAction: 'Run Test Recovery again because the prior drill is out of date.'
  }));

  checks.push(backupCheck(context.backupHealth));

  const earned = checks.reduce((sum, item) => sum + item.pointsEarned, 0);
  const possible = checks.reduce((sum, item) => sum + item.pointsPossible, 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;
  const blocking = checks.filter((item) => item.state === 'incomplete').length;
  const review = checks.filter((item) => item.state === 'review').length;
  const status = blocking > 0 ? 'Incomplete' : review > 0 ? 'Needs Review' : 'Ready';
  const actions = checks.filter((item) => item.action).map((item) => ({ id: item.id, action: item.action }));

  return Object.freeze({
    status,
    score,
    checks: Object.freeze(checks),
    actions: Object.freeze(actions),
    verificationDays,
    drillDays
  });
}

module.exports = {
  DAY_MS,
  DEFAULT_VERIFICATION_DAYS,
  DEFAULT_DRILL_DAYS,
  daysSince,
  hasRecoveryMethod,
  hasRecoveryLocation,
  hasInstructions,
  addressCoverage,
  evaluateWallet,
  _test: { parseDate, normalizeDays, datedCheck, backupCheck }
};
