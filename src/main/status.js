'use strict';

const STATUS_TIMEOUT_MS = 5000;
const STATUS_ICONS = Object.freeze({
  info: 'fa fa-info-circle',
  success: 'fa fa-check-circle',
  danger: 'fa fa-exclamation-circle',
  processing: 'fa fa-refresh fa-spin'
});
const ROUTINE_SUCCESS = /^load(?:ed)? successful(?:ly)?\.?$/i;
let closeTimer = null;

function statusArea() {
  return document.getElementById('statusArea');
}

function cancelCloseTimer() {
  if (closeTimer == null) return;
  window.clearTimeout(closeTimer);
  closeTimer = null;
}

function resetArea(area) {
  cancelCloseTimer();
  if (area) area.innerHTML = '';
}

function statusKind(value) {
  switch (String(value || '').toUpperCase()) {
  case 'SUCCESS': return 'success';
  case 'ERROR':
  case 'DELETED': return 'danger';
  default: return 'info';
  }
}

function shouldDisplayStatus(params = {}) {
  const state = String(params.status || '').toUpperCase();
  if (state === 'ERROR' || state === 'DELETED') return true;
  if (state === 'SUCCESS') return !ROUTINE_SUCCESS.test(String(params.statusMsg || '').trim());
  return state === 'INFO' || state === 'WARNING';
}

function createMessage(kind, message, options = {}) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${kind} safeledger-status safeledger-status-${kind}`;
  alert.setAttribute('role', options.role || (kind === 'danger' ? 'alert' : 'status'));
  alert.setAttribute('aria-live', options.ariaLive || (kind === 'danger' ? 'assertive' : 'polite'));
  alert.setAttribute('aria-atomic', 'true');

  const iconClass = options.iconClass === false ? '' : (options.iconClass || STATUS_ICONS[kind]);
  if (iconClass) {
    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');
    alert.appendChild(icon);
  }

  const text = document.createElement('span');
  text.className = 'safeledger-status-text';
  text.textContent = String(message || '');
  alert.appendChild(text);
  return alert;
}

function closeStatus() {
  const area = statusArea();
  resetArea(area);
}

exports.showStatus = (params = {}) => {
  if (!shouldDisplayStatus(params)) return false;
  const area = statusArea();
  if (!area) return false;
  resetArea(area);

  const state = String(params.status || '').toUpperCase();
  const kind = statusKind(state);
  const options = state === 'DELETED' ? { role: 'status', ariaLive: 'polite' } : {};
  area.appendChild(createMessage(kind, params.statusMsg, options));
  closeTimer = window.setTimeout(closeStatus, STATUS_TIMEOUT_MS);
  return true;
};

// Routine reads no longer create a temporary Processing notice. SafeLedger
// still blocks conflicting actions through saving.state, while the status area
// is reserved for completed changes, actionable notices, and errors.
exports.loadStatus = () => false;

exports.clearStatus = closeStatus;
exports.hideStatus = closeStatus;
exports._test = {
  STATUS_TIMEOUT_MS,
  STATUS_ICONS,
  ROUTINE_SUCCESS,
  statusKind,
  shouldDisplayStatus,
  createMessage,
  cancelCloseTimer
};
