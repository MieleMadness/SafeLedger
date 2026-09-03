'use strict';

const STATUS_TIMEOUT_MS = 5000;
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
  case 'ERROR': return 'danger';
  default: return 'info';
  }
}

function createMessage(kind, message, options = {}) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${kind} safeledger-status safeledger-status-${kind}`;
  alert.setAttribute('role', options.role || (kind === 'danger' ? 'alert' : 'status'));
  alert.setAttribute('aria-live', kind === 'danger' ? 'assertive' : 'polite');
  alert.setAttribute('aria-atomic', 'true');

  if (options.iconClass) {
    const icon = document.createElement('i');
    icon.className = options.iconClass;
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
  const area = statusArea();
  if (!area) return;
  resetArea(area);

  const kind = statusKind(params.status);
  area.appendChild(createMessage(kind, params.statusMsg));
  closeTimer = window.setTimeout(closeStatus, STATUS_TIMEOUT_MS);
};

exports.loadStatus = () => {
  const area = statusArea();
  if (!area) return;
  resetArea(area);
  area.appendChild(createMessage('processing', 'Processing', {
    role: 'status',
    iconClass: 'fa fa-refresh fa-spin'
  }));
};

exports.clearStatus = closeStatus;
exports.hideStatus = closeStatus;
exports._test = {
  STATUS_TIMEOUT_MS,
  statusKind,
  createMessage,
  cancelCloseTimer
};
