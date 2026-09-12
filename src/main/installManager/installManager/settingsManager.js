'use strict';

const fs = require('fs');
const path = require('path');
const lockoutState = require('../../lockout-state');
const settingsSchema = require('../../settings-schema');
const backupHealth = require('../../backup-health');
const { atomicWriteJson } = require('../../atomic-file');

const { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue, normalizeAppearance, normalizePrivacyMode, normalizeBoolean } = settingsSchema;
const APPEARANCE_SCHEMA_VERSION = 2;

const USER_EDITABLE_KEYS = Object.freeze([
  'appearance',
  'privacyMode',
  'shitCoinMode',
  'numFailAttempts',
  'numLockoutRetries',
  'minutesToWaitBetweenLockout',
  'backupReminderDays'
]);
const USER_EDITABLE_SET = new Set(USER_EDITABLE_KEYS);

const defaults = () => ({
  formatVersion: 2,
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  appearance: 'system',
  appearanceSchemaVersion: APPEARANCE_SCHEMA_VERSION,
  privacyMode: true,
  shitCoinMode: false,
  failAttemptCount: 0,
  numFailAttempts: 5,
  lockOutCount: 0,
  numLockoutRetries: 5,
  lockLogin: false,
  lockLoginTime: 0,
  minutesToWaitBetweenLockout: 15,
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
  const source = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const next = Object.assign({}, baseDefaults, source);

  delete next.activationCode;
  delete next.atime;
  delete next.upper;
  delete next.lower;
  delete next.masterKeyVerifier;

  const sourceAppearanceVersion = Number.parseInt(source.appearanceSchemaVersion, 10);
  const legacyAppearance = String(source.appearance || '').trim().toLowerCase();
  const migrateLegacyLight = (!Number.isFinite(sourceAppearanceVersion) || sourceAppearanceVersion < APPEARANCE_SCHEMA_VERSION) && legacyAppearance === 'light';
  next.appearance = migrateLegacyLight ? 'colorful' : normalizeAppearance(next.appearance);
  next.appearanceSchemaVersion = APPEARANCE_SCHEMA_VERSION;
  next.privacyMode = normalizePrivacyMode(next.privacyMode);
  next.shitCoinMode = normalizeBoolean(next.shitCoinMode, false);
  next.numFailAttempts = clampBruteForceValue(next.numFailAttempts, baseDefaults.numFailAttempts);
  next.numLockoutRetries = clampBruteForceValue(next.numLockoutRetries, baseDefaults.numLockoutRetries);
  next.minutesToWaitBetweenLockout = clampBruteForceValue(next.minutesToWaitBetweenLockout, baseDefaults.minutesToWaitBetweenLockout);
  next.failAttemptCount = normalizeCounter(next.failAttemptCount, baseDefaults.failAttemptCount);
  next.lockOutCount = normalizeCounter(next.lockOutCount, baseDefaults.lockOutCount);
  next.lockLogin = normalizeBoolean(next.lockLogin, false);
  next.scrubContentAfterRetries = normalizeBoolean(next.scrubContentAfterRetries, false);
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

function pickUserSettingsPatch(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Invalid settings update.');
  const knownKeys = new Set(Object.keys(defaults()));
  const patch = {};
  for (const [key, value] of Object.entries(request)) {
    if (USER_EDITABLE_SET.has(key)) {
      patch[key] = value;
      continue;
    }
    // Older renderer builds send the complete settings snapshot. Security-
    // owned fields are accepted as context but deliberately ignored here so a
    // renderer cannot rewrite retry counters, lock state, backup evidence, or
    // self-destruct state through the generic settings path.
    if (knownKeys.has(key)) continue;
    throw new Error(`Unsupported SafeLedger setting: ${key}`);
  }
  if (!Object.keys(patch).length) throw new Error('No user-editable settings were provided.');
  return patch;
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

exports.saveUserSettings = async (dir, request) => {
  const patch = pickUserSettingsPatch(request);
  const loaded = await exports.loadSettings(dir);
  const current = loaded.settings;
  const next = Object.assign({}, current, patch);
  return exports.saveSettings(dir, next);
};

exports.USER_EDITABLE_KEYS = USER_EDITABLE_KEYS;
exports._test = {
  BRUTE_FORCE_MIN,
  BRUTE_FORCE_MAX,
  APPEARANCE_SCHEMA_VERSION,
  clampBruteForceValue,
  normalizeCounter,
  normalizeSettings,
  defaults,
  pickUserSettingsPatch
};
