'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const passwordControls = require('./password-controls');

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
  // SafeLedger 2.3 routes every non-password lock through the trusted main
  // process lock controller. Emergency/inactivity locks minimize and reload.
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

function enhanceLoginPassword() {
  const input = document.getElementById('masterCryptoInput');
  if (!input || input.dataset.safeledgerEnhanced === '1') return;
  input.dataset.safeledgerEnhanced = '1';
  passwordControls.configure(input, { autocomplete: 'off', strength: true });
}

ipc.on('result-init-system', () => setTimeout(enhanceLoginPassword, 0));
ipc.on('result', (_evt, params) => {
  if (params && params.status === 'SUCCESS' && params.type === 'vaultlist-init') {
    unlockedSession = true;
    panicRunning = false;
    setTimeout(resetIdleTimer, 0);
  }
  if (params && params.type === 'session-locked') {
    unlockedSession = false;
    clearTimeout(idleTimer);
  }
  setTimeout(enhanceLoginPassword, 0);
});
ipc.on('security-session-locked', (_evt, payload) => handleSecuritySessionLocked(payload));
ipc.on('result-lockout-destroy', () => {
  unlockedSession = false;
  clearTimeout(idleTimer);
});

window.addEventListener('DOMContentLoaded', () => {
  enhanceLoginPassword();
  resetIdleTimer();
  const panic = document.getElementById('panicLockButton');
  if (panic) panic.addEventListener('click', () => panicLock('emergency-lock'));
});
window.addEventListener('beforeunload', () => clearTimeout(idleTimer));

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
  try {
    const result = await ipc.invoke('security-verify-backup');
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Backup verification failed.');
    const report = result.report || {};
    try { await ipc.invoke('device-record-backup-verified', report.created || null); } catch (_) {}
    alert(`Backup verified.\n\nProfiles: ${report.profileCount || 0}\nWallets: ${report.walletCount || 0}\nAssets: ${report.assetCount || 0}\nFiles: ${report.fileCount || 0}${report.created ? `\nCreated: ${report.created}` : ''}`);
  } catch (err) { alert(`Backup verification failed: ${err.message || err}`); }
}

async function restoreEncryptedBackup() {
  try {
    const result = await ipc.invoke('security-restore-all');
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Restore failed.');
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
exports._test = { AUTO_LOCK_MINUTES, clearVisibleSensitiveFields, handleSecuritySessionLocked, renderRestartRequiredLock };
