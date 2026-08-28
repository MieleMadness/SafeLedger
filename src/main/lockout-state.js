'use strict';

const MINUTE_MS = 60 * 1000;

function lockoutDeadline(settings) {
  if (!settings || !settings.lockLogin) return 0;
  const started = Number(settings.lockLoginTime);
  const minutes = Number(settings.minutesToWaitBetweenLockout);
  if (!Number.isFinite(started) || started <= 0) return 0;
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return started + (minutes * MINUTE_MS);
}

function isLockoutActive(settings, now = Date.now()) {
  const deadline = lockoutDeadline(settings);
  const current = Number(now);
  return deadline > 0 && Number.isFinite(current) && deadline > current;
}

function remainingLockoutMs(settings, now = Date.now()) {
  const deadline = lockoutDeadline(settings);
  const current = Number(now);
  if (!deadline || !Number.isFinite(current)) return 0;
  return Math.max(0, deadline - current);
}

module.exports = {
  MINUTE_MS,
  lockoutDeadline,
  isLockoutActive,
  remainingLockoutMs
};
