'use strict';

const BRUTE_FORCE_MIN = 1;
const BRUTE_FORCE_MAX = 99;

function clampBruteForceValue(value, fallback = BRUTE_FORCE_MIN) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(BRUTE_FORCE_MAX, Math.max(BRUTE_FORCE_MIN, parsed));
}

exports.BRUTE_FORCE_MIN = BRUTE_FORCE_MIN;
exports.BRUTE_FORCE_MAX = BRUTE_FORCE_MAX;
exports.clampBruteForceValue = clampBruteForceValue;
