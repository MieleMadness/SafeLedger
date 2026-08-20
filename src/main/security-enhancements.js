'use strict';

const electron = require('electron');
const remote = electron.remote;
const fs = require('fs');
const path = require('path');

const AUTO_LOCK_MINUTES = 5;
let idleTimer = null;
let panicRunning = false;

const getPortableRoot = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (process.mainModule && process.mainModule.filename) return path.dirname(process.execPath);
  return path.dirname(process.execPath);
};

const getVaultDir = () => path.join(getPortableRoot(), 'SafeLedgerData', 'vaults');

function clearVisibleSensitiveFields() {
  document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach((el) => {
    if (/password|private|seed|pin|recovery/i.test(`${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`)) {
      el.value = '';
    }
  });
  document.querySelectorAll('.sensitive-value, .sensitive-field-content').forEach((el) => {
    el.textContent = '';
  });
  document.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
}

function panicLock() {
  if (panicRunning) return;
  panicRunning = true;
  try { clearVisibleSensitiveFields(); } catch (_) {}
  try {
    const win = remote.getCurrentWindow();
    win.minimize();
  } catch (_) {}
  // Reloading destroys the renderer's unlocked JS state (master key, vault data,
  // selections and revealed fields) and returns SafeLedger to the login flow.
  setTimeout(() => window.location.reload(), 50);
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  // Only auto-lock when the app appears to be in an unlocked session.
  const hasVaultUi = document.getElementById('vaultArea') && document.getElementById('vaultArea').textContent.trim().length > 0;
  if (!hasVaultUi) return;
  idleTimer = setTimeout(panicLock, AUTO_LOCK_MINUTES * 60 * 1000);
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

const observer = new MutationObserver(() => enhanceLoginPassword());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', () => {
  enhanceLoginPassword();
  resetIdleTimer();

  const panic = document.getElementById('panicLockButton');
  if (panic) panic.addEventListener('click', panicLock);

  const backup = document.getElementById('backupButton');
  if (backup) backup.addEventListener('click', exportEncryptedBackup);

  const restore = document.getElementById('restoreButton');
  if (restore) restore.addEventListener('click', restoreEncryptedBackup);
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

    const payload = {
      format: 'safeledger-encrypted-backup',
      version: 1,
      created: new Date().toISOString(),
      note: 'The files in this package remain encrypted by SafeLedger.',
      files
    };
    const temp = `${selection.filePath}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(payload), 'utf8');
    await fs.promises.rename(temp, selection.filePath);
    alert(`Encrypted backup created with ${Object.keys(files).length} file(s).`);
  } catch (err) {
    alert(`Backup failed: ${err.message || err}`);
  }
}

async function restoreEncryptedBackup() {
  try {
    const selection = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: 'Restore Encrypted SafeLedger Backup',
      properties: ['openFile'],
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (selection.canceled || !selection.filePaths.length) return;
    const payload = JSON.parse(await fs.promises.readFile(selection.filePaths[0], 'utf8'));
    if (!payload || payload.format !== 'safeledger-encrypted-backup' || payload.version !== 1 || !payload.files || !payload.files['vaultlist.json']) {
      return alert('That file is not a valid SafeLedger encrypted backup.');
    }
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
    alert('Backup restored. SafeLedger will lock and reload.');
    panicLock();
  } catch (err) {
    alert(`Restore failed: ${err.message || err}`);
  }
}

exports.panicLock = panicLock;
