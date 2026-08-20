'use strict';

const electron = require('electron');
const remote = electron.remote;
const { ipcRenderer: ipc } = electron;
const fs = require('fs');
const path = require('path');

const AUTO_LOCK_MINUTES = 5;
let idleTimer = null;
let panicRunning = false;
let badgeTimer = null;

const getPortableRoot = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  return path.dirname(process.execPath);
};
const getVaultDir = () => path.join(getPortableRoot(), 'SafeLedgerData', 'vaults');
const getSettingsDir = () => path.join(getPortableRoot(), 'SafeLedgerData', 'settings');

async function audit(eventName) {
  try {
    const dir = getSettingsDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const line = `${new Date().toISOString()}\t${eventName}\n`;
    await fs.promises.appendFile(path.join(dir, 'audit.log'), line, 'utf8');
  } catch (_) {}
}

function ensureSecurityBadge() {
  let badge = document.getElementById('securityStateBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'securityStateBadge';
    badge.className = 'security-state-badge';
    document.body.appendChild(badge);
  }
  return badge;
}

function updateSecurityBadge() {
  if (!document.body) return;
  const badge = ensureSecurityBadge();
  const loginVisible = !!document.getElementById('masterCryptoInput');
  const hasProfiles = !!(document.getElementById('vaultArea') && document.getElementById('vaultArea').textContent.trim());
  const nextState = (loginVisible || !hasProfiles) ? 'locked' : 'unlocked';
  const nextText = nextState === 'locked' ? 'OFFLINE • LOCKED' : 'OFFLINE • UNLOCKED';

  // Only mutate the DOM when the state actually changes. This prevents the
  // security badge from recursively triggering DOM observers.
  if (badge.dataset.state !== nextState) badge.dataset.state = nextState;
  if (badge.textContent !== nextText) badge.textContent = nextText;
}

function clearVisibleSensitiveFields() {
  document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach((el) => {
    if (/password|private|seed|pin|recovery/i.test(`${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`)) el.value = '';
  });
  document.querySelectorAll('.sensitive-value').forEach((el) => { el.textContent = ''; });
  document.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
}

function panicLock(reason = 'panic-lock') {
  if (panicRunning) return;
  panicRunning = true;
  audit(reason);

  try { clearVisibleSensitiveFields(); } catch (_) {}

  // Clear unlocked state in the main process as well as the renderer. The
  // encrypted files on disk are not changed by an emergency/inactivity lock.
  try { ipc.send('panic-lock', { reason }); } catch (_) {}

  try { remote.getCurrentWindow().minimize(); } catch (_) {}

  // Reloading destroys the renderer's master key, decrypted vault objects and
  // any revealed fields, then returns SafeLedger to the normal login flow.
  setTimeout(() => window.location.reload(), 100);
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  const hasVaultUi = document.getElementById('vaultArea') && document.getElementById('vaultArea').textContent.trim().length > 0;
  const loginVisible = !!document.getElementById('masterCryptoInput');
  if (!hasVaultUi || loginVisible) return;
  idleTimer = setTimeout(() => panicLock('inactivity-auto-lock'), AUTO_LOCK_MINUTES * 60 * 1000);
}

['mousemove','mousedown','keydown','touchstart','scroll'].forEach((eventName) => {
  window.addEventListener(eventName, resetIdleTimer, { passive: true });
});

function scorePassword(value) {
  const password = String(value || '');
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 15) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/(.)\1{2,}/.test(password)) score--;
  if (/password|qwerty|123456|letmein|admin/i.test(password)) score -= 2;
  return Math.max(0, Math.min(5, score));
}

function enhanceLoginPassword() {
  const input = document.getElementById('masterCryptoInput');
  if (!input || input.dataset.safeledgerEnhanced === '1') return;
  input.dataset.safeledgerEnhanced = '1';
  input.setAttribute('autocomplete', 'off');

  const controls = document.createElement('div');
  controls.className = 'login-security-controls';
  const show = document.createElement('button');
  show.type = 'button';
  show.className = 'btn btn-default btn-sm';
  show.innerHTML = '<i class="fa fa-eye"></i> Show Text';
  show.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    show.innerHTML = hidden ? '<i class="fa fa-eye-slash"></i> Hide Text' : '<i class="fa fa-eye"></i> Show Text';
  });
  controls.appendChild(show);
  input.parentNode.insertBefore(controls, input.nextSibling);

  const meter = document.createElement('div');
  meter.className = 'password-strength';
  const bar = document.createElement('div');
  bar.className = 'password-strength-bar';
  const label = document.createElement('span');
  label.className = 'password-strength-label';
  meter.appendChild(bar);
  meter.appendChild(label);
  controls.parentNode.insertBefore(meter, controls.nextSibling);

  const labels = ['Weak','Weak','Fair','Good','Strong','Excellent'];
  const update = () => {
    const score = scorePassword(input.value);
    bar.style.width = `${score * 20}%`;
    label.textContent = `${labels[score]}${input.value.length < 15 ? ' — 15+ characters recommended' : ''}`;
    meter.dataset.score = String(score);
  };
  input.addEventListener('input', update);
  update();
}

// The legacy renderer creates the login field dynamically. Observe only to
// attach the login controls. Do not update badges/timers from this observer:
// those operations mutate the DOM and previously caused a recursive loop that
// could leave Electron displaying a white window.
const observer = new MutationObserver(() => enhanceLoginPassword());
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('DOMContentLoaded', () => {
  audit('app-opened');
  enhanceLoginPassword();
  updateSecurityBadge();
  resetIdleTimer();

  // Polling the tiny status indicator is intentionally isolated from the DOM
  // observer. updateSecurityBadge is idempotent and only changes DOM on state
  // transitions.
  badgeTimer = setInterval(updateSecurityBadge, 1000);

  const panic = document.getElementById('panicLockButton');
  if (panic) panic.addEventListener('click', () => panicLock('emergency-lock'));
  const backup = document.getElementById('backupButton');
  if (backup) backup.addEventListener('click', exportEncryptedBackup);
  const restore = document.getElementById('restoreButton');
  if (restore) restore.addEventListener('click', restoreEncryptedBackup);
});

window.addEventListener('beforeunload', () => {
  clearTimeout(idleTimer);
  if (badgeTimer) clearInterval(badgeTimer);
});

async function exportEncryptedBackup() {
  try {
    const vaultDir = getVaultDir();
    const names = await fs.promises.readdir(vaultDir);
    const files = {};
    for (const name of names) {
      const full = path.join(vaultDir, name);
      const stat = await fs.promises.stat(full);
      if (stat.isFile()) files[name] = (await fs.promises.readFile(full)).toString('base64');
    }
    if (!files['vaultlist.json']) return alert('No SafeLedger vault data was found to back up.');
    const selection = await remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
      title: 'Export Encrypted SafeLedger Backup',
      defaultPath: `SafeLedger-${new Date().toISOString().slice(0,10)}.slgbak`,
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (selection.canceled || !selection.filePath) return;
    const payload = { format:'safeledger-encrypted-backup', version:1, created:new Date().toISOString(), note:'The files in this package remain encrypted by SafeLedger.', files };
    const temp = `${selection.filePath}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(payload), 'utf8');
    await fs.promises.rename(temp, selection.filePath);
    audit('encrypted-backup-exported');
    alert(`Encrypted backup created with ${Object.keys(files).length} file(s).`);
  } catch (err) { alert(`Backup failed: ${err.message || err}`); }
}

async function restoreEncryptedBackup() {
  try {
    const selection = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: 'Restore Encrypted SafeLedger Backup', properties:['openFile'], filters:[{name:'SafeLedger Backup',extensions:['slgbak']}]
    });
    if (selection.canceled || !selection.filePaths.length) return;
    const payload = JSON.parse(await fs.promises.readFile(selection.filePaths[0], 'utf8'));
    if (!payload || payload.format !== 'safeledger-encrypted-backup' || payload.version !== 1 || !payload.files || !payload.files['vaultlist.json']) return alert('That file is not a valid SafeLedger encrypted backup.');
    if (!confirm('Restore this backup? SafeLedger will first copy the current encrypted vault files to a pre-restore safety folder.')) return;
    const vaultDir = getVaultDir();
    const dataRoot = path.dirname(vaultDir);
    const safetyDir = path.join(dataRoot, `pre-restore-${new Date().toISOString().replace(/[:.]/g,'-')}`);
    await fs.promises.mkdir(safetyDir, { recursive: true });
    await fs.promises.mkdir(vaultDir, { recursive: true });
    for (const name of await fs.promises.readdir(vaultDir)) {
      const src = path.join(vaultDir, name);
      const stat = await fs.promises.stat(src);
      if (stat.isFile()) await fs.promises.copyFile(src, path.join(safetyDir, name));
    }
    for (const [name, encoded] of Object.entries(payload.files)) {
      if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') throw new Error('Backup contains an invalid file name.');
      await fs.promises.writeFile(path.join(vaultDir, name), Buffer.from(encoded, 'base64'));
    }
    audit('encrypted-backup-restored');
    alert('Backup restored. SafeLedger will lock and reload.');
    panicLock('post-restore-lock');
  } catch (err) { alert(`Restore failed: ${err.message || err}`); }
}

exports.panicLock = panicLock;
