'use strict';

let currentSettings = {};

function setSettings(settings) {
  currentSettings = settings && typeof settings === 'object'
    ? Object.assign({}, settings)
    : {};
  return currentSettings;
}

function isShitCoinMode() {
  return currentSettings.shitCoinMode === true;
}

function genericAssetFallback(symbol, maxLength = 2) {
  if (isShitCoinMode()) {
    return {
      text: '💩',
      className: 'shit-coin-icon',
      title: 'Unknown local asset icon — Shit Coin Mode',
      ariaLabel: 'Unknown asset icon'
    };
  }

  const text = String(symbol || '').toUpperCase().slice(0, Math.max(1, Number(maxLength) || 2)) || '•';
  return { text, className: '', title: '', ariaLabel: '' };
}

module.exports = {
  setSettings,
  isShitCoinMode,
  genericAssetFallback,
  _test: { getSettings: () => Object.assign({}, currentSettings) }
};
