'use strict';

const fs = require('fs');
const path = require('path');

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

function normalizeSettings(settings) {
  const baseDefaults = defaults();
  const next = Object.assign({}, baseDefaults, settings || {}, { activationCode: 'FREE' });
  next.numFailAttempts = clampBruteForceValue(next.numFailAttempts, baseDefaults.numFailAttempts);
  next.numLockoutRetries = clampBruteForceValue(next.numLockoutRetries, baseDefaults.numLockoutRetries);
  next.minutesToWaitBetweenLockout = clampBruteForceValue(next.minutesToWaitBetweenLockout, baseDefaults.minutesToWaitBetweenLockout);
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

exports._test = { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue, normalizeSettings };
