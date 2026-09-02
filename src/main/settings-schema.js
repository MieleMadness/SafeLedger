'use strict';

const BRUTE_FORCE_MIN = 1;
const BRUTE_FORCE_MAX = 99;
const APPEARANCE_VALUES = Object.freeze(['system', 'light', 'dark']);

function clampBruteForceValue(value, fallback = BRUTE_FORCE_MIN) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(BRUTE_FORCE_MAX, Math.max(BRUTE_FORCE_MIN, parsed));
}

function normalizeAppearance(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return APPEARANCE_VALUES.includes(normalized) ? normalized : 'system';
}

function normalizeBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback === true;
  return value === true || value === 1 || String(value).trim().toLowerCase() === 'true';
}

function normalizePrivacyMode(value) {
  return normalizeBoolean(value, true);
}

exports.BRUTE_FORCE_MIN = BRUTE_FORCE_MIN;
exports.BRUTE_FORCE_MAX = BRUTE_FORCE_MAX;
exports.APPEARANCE_VALUES = APPEARANCE_VALUES;
exports.clampBruteForceValue = clampBruteForceValue;
exports.normalizeAppearance = normalizeAppearance;
exports.normalizeBoolean = normalizeBoolean;
exports.normalizePrivacyMode = normalizePrivacyMode;
