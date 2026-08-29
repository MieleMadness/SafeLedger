'use strict';

const fs = require('fs');
const path = require('path');
const lockoutState = require('../../lockout-state');
const settingsSchema = require('../../settings-schema');
const backupHealth = require('../../backup-health');
const { atomicWriteJson } = require('../../atomic-file');

const { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue, normalizeAppearance } = settingsSchema;

const defaults = () => ({
  formatVersion: 2,
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  appearance: 'system',
  failAttemptCount: 0,
  numFailAttempts: 5,
  lockOutCount: 0,
  numLockoutRetries: 5,
  lockLogin: false,
  lockLoginTime: 0,
  minutesToWaitBetweenLockout: 15,
  // Destructive cleanup is opt-in. Lockouts remain enabled when this is false.
  scrubContentAfterRetries: false,
  lastBackupAt: null,
  lastVerifiedBackupAt: null,
  lastVerifiedBackupCreatedAt: null,
  backupReminderDays: backupHealth.DEFAULT_REMINDER_DAYS
});

function normalizeCounter(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(BRUTE_FORCE_MAX, Math.max(0, parsed));
}

function normalizeSettings(settings, now = Date.now()) {
  const baseDefaults = defaults();
  const next = Object.assign({}, baseDefaults, settings || {});

  // SafeLedger 2.x is free and password verification now belongs to the
  // Argon2id key envelope. Strip retired licensing/verifier fields when an
  // older 2.x settings file is normalized.
  delete next.activationCode;
  delete next.atime;
  delete next.upper;
  delete next.lower;
  delete next.masterKeyVerifier;

  next.appearance = normalizeAppearance(next.appearance);
  next.numFailAttempts = clampBruteForceValue(next.numFailAttempts, baseDefaults.numFailAttempts);
  next.numLockoutRetries = clampBruteForceValue(next.numLockoutRetries, baseDefaults.numLockoutRetries);
  next.minutesToWaitBetweenLockout = clampBruteForceValue(next.minutesToWaitBetweenLockout, baseDefaults.minutesToWaitBetweenLockout);
  next.failAttemptCount = normalizeCounter(next.failAttemptCount, baseDefaults.failAttemptCount);
  next.lockOutCount = normalizeCounter(next.lockOutCount, baseDefaults.lockOutCount);
  next.lockLogin = next.lockLogin === true || next.lockLogin === 1 || next.lockLogin === 'true';
  next.scrubContentAfterRetries = next.scrubContentAfterRetries === true || next.scrubContentAfterRetries === 1 || next.scrubContentAfterRetries === 'true';
  next.lastBackupAt = backupHealth.normalizeTimestamp(next.lastBackupAt);
  next.lastVerifiedBackupAt = backupHealth.normalizeTimestamp(next.lastVerifiedBackupAt);
  next.lastVerifiedBackupCreatedAt = backupHealth.normalizeTimestamp(next.lastVerifiedBackupCreatedAt);
  next.backupReminderDays = backupHealth.normalizeReminderDays(next.backupReminderDays);

  const lockTime = Number(next.lockLoginTime);
  next.lockLoginTime = Number.isFinite(lockTime) && lockTime > 0 ? Math.floor(lockTime) : 0;

  if (!lockoutState.isLockoutActive(next, now)) {
    next.lockLogin = false;
    next.lockLoginTime = 0;
  }

  return next;
}

const settingsPath = (dir) => path.join(dir, 'settings.json');

exports.loadSettings = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
  const file = settingsPath(dir);
  try {
    const parsed = JSON.parse(await fs.promises.readFile(file, 'utf8'));
    return { status: 'SUCCESS', settings: normalizeSettings(parsed) };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const settings = defaults();
    await exports.saveSettings(dir, settings);
    return { status: 'SUCCESS', settings };
  }
};

exports.saveSettings = async (dir, settings) => {
  const next = normalizeSettings(settings);
  next.modified = new Date().toISOString();
  const file = settingsPath(dir);
  await atomicWriteJson(file, next);
  return { status: 'SUCCESS', settings: next };
};

exports._test = {
  BRUTE_FORCE_MIN,
  BRUTE_FORCE_MAX,
  clampBruteForceValue,
  normalizeCounter,
  normalizeSettings,
  defaults
};
