'use strict';

const fs = require('fs');
const path = require('path');
const lockoutState = require('../../lockout-state');

const BRUTE_FORCE_MIN = 1;
const BRUTE_FORCE_MAX = 99;

const defaults = () => ({
  formatVersion: 2,
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  activationCode: 'FREE',
  failAttemptCount: 0,
  numFailAttempts: 5,
  lockOutCount: 0,
  numLockoutRetries: 5,
  lockLogin: false,
  lockLoginTime: 0,
  minutesToWaitBetweenLockout: 15,
  // Preserve SafeLedger's historical brute-force protection by default.
  // Users can explicitly disable this in Security Settings.
  scrubContentAfterRetries: true
});

function clampBruteForceValue(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(BRUTE_FORCE_MAX, Math.max(BRUTE_FORCE_MIN, parsed));
}

function normalizeCounter(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(BRUTE_FORCE_MAX, Math.max(0, parsed));
}

function normalizeSettings(settings, now = Date.now()) {
  const baseDefaults = defaults();
  const next = Object.assign({}, baseDefaults, settings || {}, { activationCode: 'FREE' });
  next.numFailAttempts = clampBruteForceValue(next.numFailAttempts, baseDefaults.numFailAttempts);
  next.numLockoutRetries = clampBruteForceValue(next.numLockoutRetries, baseDefaults.numLockoutRetries);
  next.minutesToWaitBetweenLockout = clampBruteForceValue(next.minutesToWaitBetweenLockout, baseDefaults.minutesToWaitBetweenLockout);
  next.failAttemptCount = normalizeCounter(next.failAttemptCount, baseDefaults.failAttemptCount);
  next.lockOutCount = normalizeCounter(next.lockOutCount, baseDefaults.lockOutCount);
  next.lockLogin = next.lockLogin === true || next.lockLogin === 1 || next.lockLogin === 'true';

  const lockTime = Number(next.lockLoginTime);
  next.lockLoginTime = Number.isFinite(lockTime) && lockTime > 0 ? Math.floor(lockTime) : 0;

  // A lockout is temporary. Keep failed-attempt and lockout counters intact,
  // but never let an expired or malformed lockLogin flag strand the UI on
  // restart. The next failed or successful login will persist the normalized
  // state through the regular settings save path.
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
  await fs.promises.mkdir(dir, { recursive: true });
  const next = normalizeSettings(settings);
  next.modified = new Date().toISOString();
  const file = settingsPath(dir);
  const temp = `${file}.tmp`;
  await fs.promises.writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
  await fs.promises.rename(temp, file);
  return { status: 'SUCCESS', settings: next };
};

exports._test = {
  BRUTE_FORCE_MIN,
  BRUTE_FORCE_MAX,
  clampBruteForceValue,
  normalizeCounter,
  normalizeSettings
};
