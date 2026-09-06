'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

const LOGIN_TITLE = 'Welcome to SafeLedger';
const WIDTH_TARGETS = Object.freeze([
  '.login-password-shell',
  '.login-password-strength',
  '#loginSecurityControls'
]);

function measureTitleText(header) {
  if (!header || String(header.textContent || '').trim() !== LOGIN_TITLE) return 0;
  try {
    const range = document.createRange();
    range.selectNodeContents(header);
    const rect = range.getBoundingClientRect();
    if (typeof range.detach === 'function') range.detach();
    const width = Number(rect && rect.width);
    if (Number.isFinite(width) && width > 0) return Math.ceil(width);
  } catch (_) {}
  return 0;
}

function syncLoginControlWidths() {
  const input = document.getElementById('masterCryptoInput');
  const area = document.getElementById('detailArea');
  if (!input || !area) return false;

  const header = area.querySelector('h1');
  const width = measureTitleText(header);
  if (!(width > 0)) return false;

  let updated = 0;
  for (const selector of WIDTH_TARGETS) {
    const element = area.querySelector(selector);
    if (!element) continue;
    element.style.setProperty('width', `${width}px`, 'important');
    element.style.setProperty('max-width', '100%', 'important');
    updated++;
  }
  return updated >= 2;
}

function scheduleSync() {
  if (typeof window === 'undefined') return;
  window.setTimeout(syncLoginControlWidths, 0);
  window.setTimeout(syncLoginControlWidths, 50);
}

ipc.on('result-init-system', scheduleSync);
ipc.on('result', scheduleSync);

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', scheduleSync);
  window.addEventListener('resize', scheduleSync);
}

exports._test = {
  LOGIN_TITLE,
  WIDTH_TARGETS,
  measureTitleText,
  syncLoginControlWidths,
  scheduleSync
};
