'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

const AUTO_LOCK_MINUTES = 5;
let idleTimer = null;
let panicRunning = false;
let unlockedSession = false;

function clearVisibleSensitiveFields() {
  document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach((el) => {
    if (/password|private|seed|pin|recovery/i.test(`${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`)) el.value = '';
  });
  document.querySelectorAll('.sensitive-value').forEach((el) => { el.textContent = ''; });
  document.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
}

function renderRestartRequiredLock(reason) {
  document.body.innerHTML = '';
  const screen = document.createElement('main');
  screen.className = 'security-restart-lock-screen';
  screen.style.minHeight = '100vh';
  screen.style.display = 'flex';
  screen.style.alignItems = 'center';
  screen.style.justifyContent = 'center';
  screen.style.padding = '32px';
  screen.style.background = '#0D47A1';
  screen.style.color = '#fff';

  const card = document.createElement('section');
  card.style.maxWidth = '560px';
  card.style.textAlign = 'center';
  const title = document.createElement('h1');
  title.textContent = 'SafeLedger is locked';
  card.appendChild(title);
  const message = document.createElement('p');
  message.textContent = reason === 'session-locked-storage-unavailable'
    ? 'SafeLedger storage is unavailable or no longer matches the storage used for this session. Reconnect the original storage and restart SafeLedger to sign in again.'
    : 'This session was locked for security. Restart SafeLedger to sign in again.';
  card.appendChild(message);
  screen.appendChild(card);
  document.body.appendChild(screen);
}

function handleSecuritySessionLocked(payload = {}) {
  unlockedSession = false;
  panicRunning = true;
  clearTimeout(idleTimer);
  try { clearVisibleSensitiveFields(); } catch (_) {}
  if (payload.requiresRestart === true) renderRestartRequiredLock(payload.reason);
}

function panicLock(reason = 'panic-lock') {
  if (panicRunning) return;
  panicRunning = true;
  unlockedSession = false;
  clearTimeout(idleTimer);
  try { clearVisibleSensitiveFields(); } catch (_) {}
  try { ipc.send('panic-lock', { reason }); } catch (_) {}
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  const loginVisible = !!document.getElementById('masterCryptoInput');
  if (!unlockedSession || loginVisible) return;
  idleTimer = setTimeout(() => panicLock('inactivity-auto-lock'), AUTO_LOCK_MINUTES * 60 * 1000);
}

['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) => {
  window.addEventListener(eventName, resetIdleTimer, { passive: true });
});

ipc.on('result', (_evt, params) => {
  if (params && params.status === 'SUCCESS' && params.type === 'vaultlist-init') {
    unlockedSession = true;
    panicRunning = false;
    resetIdleTimer();
  }
  if (params && params.type === 'session-locked') {
    unlockedSession = false;
    clearTimeout(idleTimer);
  }
});
ipc.on('security-session-locked', (_evt, payload) => handleSecuritySessionLocked(payload));
ipc.on('result-lockout-destroy', () => {
  unlockedSession = false;
  clearTimeout(idleTimer);
});

window.addEventListener('DOMContentLoaded', () => {
  resetIdleTimer();
  const panic = document.getElementById('panicLockButton');
  if (panic) panic.addEventListener('click', () => panicLock('emergency-lock'));
});
window.addEventListener('beforeunload', () => clearTimeout(idleTimer));

function requestBackupPassword() {
  return new Promise((resolve) => {
    const old = document.getElementById('backupRecoveryPasswordDialog');
    if (old) old.remove();

    const dialog = document.createElement('dialog');
    dialog.id = 'backupRecoveryPasswordDialog';
    dialog.className = 'settings-section';
    dialog.setAttribute('aria-labelledby', 'backupRecoveryPasswordTitle');

    const form = document.createElement('form');
    form.method = 'dialog';

    const title = document.createElement('h3');
    title.id = 'backupRecoveryPasswordTitle';
    title.className = 'settings-section-title';
    title.textContent = 'Verify Independent Recovery';
    form.appendChild(title);

    const note = document.createElement('p');
    note.className = 'settings-section-note settings-section-intro';
    note.textContent = 'Enter the master password that belongs to the backup. SafeLedger will unlock the backup’s own encrypted key envelope and authenticate every included profile. This check does not count as a login attempt.';
    form.appendChild(note);

    const label = document.createElement('label');
    label.className = 'settings-field-label';
    label.htmlFor = 'backupRecoveryPassword';
    label.textContent = 'Backup master password';
    form.appendChild(label);

    const input = document.createElement('input');
    input.id = 'backupRecoveryPassword';
    input.type = 'password';
    input.className = 'form-control';
    input.autocomplete = 'off';
    input.maxLength = 512;
    form.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'settings-section-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-default';
    cancel.textContent = 'Cancel';
    const verify = document.createElement('button');
    verify.type = 'submit';
    verify.className = 'btn btn-default';
    verify.textContent = 'Verify Backup';
    actions.appendChild(cancel);
    actions.appendChild(verify);
    form.appendChild(actions);
    dialog.appendChild(form);

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      input.value = '';
      try { dialog.close(); } catch (_) {}
      dialog.remove();
      resolve(value);
    };

    cancel.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(null);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.value) return input.focus();
      finish(input.value);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    input.focus();
  });
}

async function exportEncryptedBackup() {
  try {
    const result = await ipc.invoke('security-backup-all');
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Backup failed.');
    try { await ipc.invoke('device-record-backup-success'); } catch (_) {}
    alert(`Complete SafeLedger backup created with ${result.fileCount} file(s).`);
  } catch (err) { alert(`Backup failed: ${err.message || err}`); }
}

async function verifyEncryptedBackup() {
  let password = await requestBackupPassword();
  if (password == null) return;
  try {
    const result = await ipc.invoke('security-verify-backup', password);
    password = '';
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Backup verification failed.');
    const report = result.report || {};
    try { await ipc.invoke('device-record-backup-verified', report.created || null); } catch (_) {}
    const recovery = report.recoveryVerified
      ? '\nRecovery: Independent password unlock confirmed'
      : `\nRecovery: Legacy compatibility check only${report.warning ? `\n${report.warning}` : ''}`;
    alert(`Backup verified.\n\nProfiles: ${report.profileCount || 0}\nWallets: ${report.walletCount || 0}\nAssets: ${report.assetCount || 0}\nFiles: ${report.fileCount || 0}${report.created ? `\nCreated: ${report.created}` : ''}${recovery}`);
  } catch (err) {
    password = '';
    alert(`Backup verification failed: ${err.message || err}`);
  }
}

async function restoreEncryptedBackup() {
  try {
    const result = await ipc.invoke('security-restore-all');
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Restore failed.');
    try { await ipc.invoke('device-reset-storage-identity'); } catch (_) {}
    alert(`Complete SafeLedger backup restored.${result.safetyDir ? ` Safety copy: ${result.safetyDir}` : ''}\n\nSafeLedger will now lock and reload.`);
    panicLock('post-restore-lock');
  } catch (err) { alert(`Restore failed: ${err.message || err}`); }
}

async function selectLegacyImportSource() {
  try {
    return await ipc.invoke('legacy-import-select-source');
  } catch (err) {
    return { ok: false, message: err.message || String(err) };
  }
}

async function importLegacyData(password) {
  try {
    const result = await ipc.invoke('legacy-import-run', String(password || ''));
    if (!result || !result.ok) return result || { ok: false, message: 'SafeLedger 1.x import failed.' };
    const report = result.report || {};
    alert(`SafeLedger 1.x import completed.\n\nProfiles: ${report.profileCount || 0}\nWallets: ${report.walletCount || 0}\nAssets: ${report.assetCount || 0}\n\nThe original 1.x files were not changed. SafeLedger will lock and reload the imported data.`);
    panicLock('post-legacy-import-lock');
    return result;
  } catch (err) {
    return { ok: false, message: err.message || String(err) };
  }
}

exports.panicLock = panicLock;
exports.exportEncryptedBackup = exportEncryptedBackup;
exports.verifyEncryptedBackup = verifyEncryptedBackup;
exports.restoreEncryptedBackup = restoreEncryptedBackup;
exports.selectLegacyImportSource = selectLegacyImportSource;
exports.importLegacyData = importLegacyData;
exports._test = { AUTO_LOCK_MINUTES, clearVisibleSensitiveFields, handleSecuritySessionLocked, renderRestartRequiredLock, requestBackupPassword, resetIdleTimer };