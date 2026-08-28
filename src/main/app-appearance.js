'use strict';

const settingsSchema = require('./settings-schema');

let currentPreference = 'system';
let mediaQuery = null;

function resolveTheme(preference, systemDark = false) {
  const normalized = settingsSchema.normalizeAppearance(preference);
  return normalized === 'system' ? (systemDark ? 'dark' : 'light') : normalized;
}

function applyAppearance(preference, systemDark) {
  const normalized = settingsSchema.normalizeAppearance(preference);
  currentPreference = normalized;
  const darkMatches = typeof systemDark === 'boolean'
    ? systemDark
    : !!(mediaQuery && mediaQuery.matches);
  const theme = resolveTheme(normalized, darkMatches);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.appearance = normalized;
    document.documentElement.dataset.theme = theme;
  }
  return theme;
}

function handleSystemChange(event) {
  if (currentPreference === 'system') applyAppearance('system', !!event.matches);
}

function setup() {
  if (typeof window === 'undefined') return;
  if (typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', handleSystemChange);
    else if (typeof mediaQuery.addListener === 'function') mediaQuery.addListener(handleSystemChange);
  }
  applyAppearance('system');

  if (window.safeLedgerApi) {
    if (typeof window.safeLedgerApi.onInitSystem === 'function') {
      window.safeLedgerApi.onInitSystem((payload) => {
        if (payload && payload.settings) applyAppearance(payload.settings.appearance);
      });
    }
    if (typeof window.safeLedgerApi.onSaveSettings === 'function') {
      window.safeLedgerApi.onSaveSettings((payload) => {
        if (payload && payload.settings) applyAppearance(payload.settings.appearance);
      });
    }
  }
}

setup();

exports.resolveTheme = resolveTheme;
exports.applyAppearance = applyAppearance;
exports.getPreference = () => currentPreference;
exports._test = { handleSystemChange };
