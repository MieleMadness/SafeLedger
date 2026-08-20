'use strict';

const { ipcRenderer: ipc } = require('electron');

function createStartupScreen() {
  if (document.getElementById('startupScreen')) return;

  const style = document.createElement('style');
  style.id = 'startupScreenStyle';
  style.textContent = `
    #startupScreen {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0D47A1;
      color: #fff;
      opacity: 1;
      transition: opacity .18s ease;
    }
    #startupScreen.startup-screen-hidden { opacity: 0; pointer-events: none; }
    #startupScreen .startup-card { text-align: center; padding: 28px; }
    #startupScreen .startup-logo { width: 92px; height: 92px; object-fit: contain; display: block; margin: 0 auto 14px; }
    #startupScreen .startup-title { margin: 0 0 7px; font-size: 28px; font-weight: 600; }
    #startupScreen .startup-message { margin: 0; font-size: 13px; opacity: .82; letter-spacing: .02em; }
    #startupScreen .startup-spinner { width: 22px; height: 22px; margin: 16px auto 0; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: safeLedgerSpin .8s linear infinite; }
    @keyframes safeLedgerSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  const screen = document.createElement('div');
  screen.id = 'startupScreen';
  screen.setAttribute('role', 'status');
  screen.setAttribute('aria-live', 'polite');
  screen.innerHTML = `
    <div class="startup-card">
      <img class="startup-logo" src="./../../sl.png" alt="SafeLedger">
      <div class="startup-title">SafeLedger</div>
      <p class="startup-message">Opening your secure workspace</p>
      <div class="startup-spinner" aria-hidden="true"></div>
    </div>
  `;
  document.body.appendChild(screen);
}

function dismissStartupScreen() {
  const screen = document.getElementById('startupScreen');
  if (!screen || screen.classList.contains('startup-screen-hidden')) return;
  screen.classList.add('startup-screen-hidden');
  window.setTimeout(() => {
    if (screen.parentNode) screen.parentNode.removeChild(screen);
    const style = document.getElementById('startupScreenStyle');
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }, 180);
}

createStartupScreen();
ipc.on('result-init-system', dismissStartupScreen);
window.setTimeout(dismissStartupScreen, 8000);

function clickLegacyAction(id) {
  const button = document.getElementById(id);
  if (button) button.click();
}

function makeSection(title) {
  const section = document.createElement('section');
  section.className = 'settings-section';
  const heading = document.createElement('h3');
  heading.className = 'settings-section-title';
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function enhanceSettingsScreen() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  if (!header || header.textContent.trim() !== 'Settings') return;

  // detailArea is reused by every view. A data attribute survives innerHTML
  // replacement, which caused the legacy Settings screen to return after
  // visiting a wallet. Detect the actual section markup instead.
  if (area.querySelector('.settings-section')) return;

  const form = area.querySelector('form');
  if (!form) return;

  Array.from(area.querySelectorAll('p')).forEach((p) => {
    if (/activation\s*code/i.test(p.textContent || '')) p.remove();
  });

  const failLabel = form.querySelector('label[for="inputFailAttempts"]');
  if (failLabel) { failLabel.className = 'settings-field-label'; failLabel.textContent = 'Failed login attempts before lockout (3–10)'; }
  const retryLabel = form.querySelector('label[for="inputLockoutRetry"]');
  if (retryLabel) { retryLabel.className = 'settings-field-label'; retryLabel.textContent = 'Lockouts allowed before self-destruct (2–5)'; }
  const waitLabel = form.querySelector('label[for="inputBetweenLockout"]');
  if (waitLabel) { waitLabel.className = 'settings-field-label'; waitLabel.textContent = 'Lockout duration in minutes (15–1440)'; }
  const protectionLabel = form.querySelector('label[for="inputScrubContent"]');
  if (protectionLabel) {
    protectionLabel.className = 'settings-protection-note';
    protectionLabel.textContent = 'Self-destruct protection is enabled. If all configured lockouts are exhausted, SafeLedger permanently destroys the encrypted vault data.';
  }

  const save = form.querySelector('#saveBtn');
  if (save) {
    save.classList.remove('pull-right');
    save.classList.add('settings-section-save');
    save.innerHTML = '<span class="glyphicon glyphicon-save" aria-hidden="true"></span> Save Brute Force Settings';
  }

  const bruteSection = makeSection('Brute Force Protection');
  area.insertBefore(bruteSection, form);
  bruteSection.appendChild(form);

  const modified = Array.from(area.querySelectorAll('p.dates')).find((p) => /modified/i.test(p.textContent || ''));
  if (modified) bruteSection.appendChild(modified);

  const backupSection = makeSection('Backup & Recovery');
  const backupNote = document.createElement('p');
  backupNote.className = 'settings-section-note settings-section-intro';
  backupNote.textContent = 'Create a complete backup of SafeLedgerData or restore a previous backup. Backups include every profile and local setting, while encrypted vault files remain encrypted.';
  backupSection.appendChild(backupNote);

  const backupActions = document.createElement('div');
  backupActions.className = 'settings-section-actions';
  const backup = document.createElement('button');
  backup.type = 'button';
  backup.className = 'btn btn-default';
  backup.innerHTML = '<i class="fa fa-download"></i> Backup';
  backup.addEventListener('click', () => clickLegacyAction('backupButton'));
  backupActions.appendChild(backup);

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-default';
  restore.innerHTML = '<i class="fa fa-upload"></i> Restore';
  restore.addEventListener('click', () => clickLegacyAction('restoreButton'));
  backupActions.appendChild(restore);
  backupSection.appendChild(backupActions);
  area.appendChild(backupSection);

  const passwordSection = makeSection('Password');
  const passwordNote = document.createElement('p');
  passwordNote.className = 'settings-section-note settings-section-intro';
  passwordNote.textContent = 'Change the master password used to unlock and encrypt your SafeLedger vaults. You will need your current password to complete the change.';
  passwordSection.appendChild(passwordNote);

  const changePassword = document.createElement('button');
  changePassword.type = 'button';
  changePassword.className = 'btn btn-default';
  changePassword.innerHTML = '<i class="fa fa-lock"></i> Change Password';
  changePassword.addEventListener('click', () => clickLegacyAction('encryptionSettings'));
  passwordSection.appendChild(changePassword);
  area.appendChild(passwordSection);
}

window.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('detailArea');
  if (!area) return;
  enhanceSettingsScreen();
  const observer = new MutationObserver(() => enhanceSettingsScreen());
  observer.observe(area, { childList: true, subtree: true });
});
