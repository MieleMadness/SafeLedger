'use strict';

const electron = require('electron');
const remote = electron.remote;
const { ipcRenderer: ipc } = electron;
const fs = require('fs');
const path = require('path');

const AUTO_LOCK_MINUTES = 5;
let idleTimer = null;
let panicRunning = false;

const getPortableRoot = () => {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  return path.dirname(process.execPath);
};
const getDataRoot = () => path.join(getPortableRoot(), 'SafeLedgerData');
const getSettingsDir = () => path.join(getDataRoot(), 'settings');

async function audit(eventName) {
  try {
    const dir = getSettingsDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const line = `${new Date().toISOString()}\t${eventName}\n`;
    await fs.promises.appendFile(path.join(dir, 'audit.log'), line, 'utf8');
  } catch (_) {}
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
  try { ipc.send('panic-lock', { reason }); } catch (_) {}
  try { remote.getCurrentWindow().minimize(); } catch (_) {}
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

const observer = new MutationObserver(() => enhanceLoginPassword());
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('DOMContentLoaded', () => {
  audit('app-opened');
  enhanceLoginPassword();
  resetIdleTimer();
  const panic = document.getElementById('panicLockButton');
  if (panic) panic.addEventListener('click', () => panicLock('emergency-lock'));
  const backup = document.getElementById('backupButton');
  if (backup) backup.addEventListener('click', exportEncryptedBackup);
  const restore = document.getElementById('restoreButton');
  if (restore) restore.addEventListener('click', restoreEncryptedBackup);
});

window.addEventListener('beforeunload', () => clearTimeout(idleTimer));

async function collectFiles(root, current = root, files = {}) {
  let entries;
  try { entries = await fs.promises.readdir(current, { withFileTypes: true }); }
  catch (err) { if (err.code === 'ENOENT') return files; throw err; }
  for (const entry of entries) {
    if (entry.name.startsWith('pre-restore-') || entry.name.startsWith('SafeLedgerData-pre-restore-')) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, full, files);
    } else if (entry.isFile()) {
      const relative = path.relative(root, full).split(path.sep).join('/');
      files[relative] = (await fs.promises.readFile(full)).toString('base64');
    }
  }
  return files;
}

async function copyDirectory(source, destination) {
  await fs.promises.mkdir(destination, { recursive: true });
  let entries = [];
  try { entries = await fs.promises.readdir(source, { withFileTypes: true }); }
  catch (err) { if (err.code === 'ENOENT') return; throw err; }
  for (const entry of entries) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyDirectory(src, dest);
    else if (entry.isFile()) await fs.promises.copyFile(src, dest);
  }
}

function safeBackupPath(root, relative) {
  const normalized = path.normalize(relative.replace(/\//g, path.sep));
  if (!normalized || normalized === '.' || normalized.startsWith('..') || path.isAbsolute(normalized)) throw new Error('Backup contains an invalid path.');
  const target = path.resolve(root, normalized);
  const rootResolved = path.resolve(root) + path.sep;
  if (!target.startsWith(rootResolved)) throw new Error('Backup contains an invalid path.');
  return target;
}

async function exportEncryptedBackup() {
  try {
    const dataRoot = getDataRoot();
    const files = await collectFiles(dataRoot);
    if (!files['vaults/vaultlist.json']) return alert('No SafeLedger vault data was found to back up.');

    const selection = await remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
      title: 'Export Complete SafeLedger Backup',
      defaultPath: `SafeLedger-All-Data-${new Date().toISOString().slice(0,10)}.slgbak`,
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (selection.canceled || !selection.filePath) return;

    const payload = {
      format: 'safeledger-complete-data-backup',
      version: 2,
      created: new Date().toISOString(),
      note: 'Contains the complete SafeLedgerData folder. Vault files remain encrypted with the SafeLedger master password.',
      files
    };
    const temp = `${selection.filePath}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(payload), 'utf8');
    await fs.promises.rename(temp, selection.filePath);
    audit('complete-data-backup-exported');
    alert(`Complete SafeLedger backup created with ${Object.keys(files).length} file(s).`);
  } catch (err) { alert(`Backup failed: ${err.message || err}`); }
}

async function restoreEncryptedBackup() {
  try {
    const selection = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: 'Restore Complete SafeLedger Backup',
      properties: ['openFile'],
      filters: [{ name: 'SafeLedger Backup', extensions: ['slgbak'] }]
    });
    if (selection.canceled || !selection.filePaths.length) return;

    const payload = JSON.parse(await fs.promises.readFile(selection.filePaths[0], 'utf8'));
    if (!payload || payload.format !== 'safeledger-complete-data-backup' || payload.version !== 2 || !payload.files || !payload.files['vaults/vaultlist.json']) {
      return alert('That file is not a current complete SafeLedger backup. Older vault-only backups should be restored with an earlier test build.');
    }
    if (!confirm('Restore the complete SafeLedgerData backup? A safety copy of the current SafeLedgerData folder will be created first.')) return;

    const dataRoot = getDataRoot();
    const parent = path.dirname(dataRoot);
    const safetyDir = path.join(parent, `SafeLedgerData-pre-restore-${new Date().toISOString().replace(/[:.]/g,'-')}`);
    await copyDirectory(dataRoot, safetyDir);
    await fs.promises.rm(dataRoot, { recursive: true, force: true });
    await fs.promises.mkdir(dataRoot, { recursive: true });

    for (const [relative, encoded] of Object.entries(payload.files)) {
      const target = safeBackupPath(dataRoot, relative);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, Buffer.from(encoded, 'base64'));
    }

    audit('complete-data-backup-restored');
    alert(`Complete SafeLedger backup restored. Safety copy: ${safetyDir}\n\nSafeLedger will now lock and reload.`);
    panicLock('post-restore-lock');
  } catch (err) { alert(`Restore failed: ${err.message || err}`); }
}

exports.panicLock = panicLock;
exports.exportEncryptedBackup = exportEncryptedBackup;
exports.restoreEncryptedBackup = restoreEncryptedBackup;
