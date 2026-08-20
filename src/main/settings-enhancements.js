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

function enhanceSettingsScreen() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  if (!header || header.textContent.trim() !== 'Settings') return;
  if (area.querySelector('.settings-security-actions')) return;

  const actions = document.createElement('div');
  actions.className = 'settings-security-actions';

  const changePassword = document.createElement('button');
  changePassword.type = 'button';
  changePassword.className = 'btn btn-default';
  changePassword.innerHTML = '<i class="fa fa-lock"></i> Change Password';
  changePassword.addEventListener('click', () => clickLegacyAction('encryptionSettings'));
  actions.appendChild(changePassword);

  const backup = document.createElement('button');
  backup.type = 'button';
  backup.className = 'btn btn-default';
  backup.innerHTML = '<i class="fa fa-download"></i> Backup';
  backup.addEventListener('click', () => clickLegacyAction('backupButton'));
  actions.appendChild(backup);

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-default';
  restore.innerHTML = '<i class="fa fa-upload"></i> Restore';
  restore.addEventListener('click', () => clickLegacyAction('restoreButton'));
  actions.appendChild(restore);

  const note = document.createElement('p');
  note.className = 'settings-backup-note';
  note.textContent = 'Backup and restore include the complete SafeLedgerData folder, including every profile/vault and local settings. Vault files remain encrypted.';
  actions.appendChild(note);

  area.appendChild(actions);
}

window.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('detailArea');
  if (!area) return;
  enhanceSettingsScreen();
  const observer = new MutationObserver(() => enhanceSettingsScreen());
  observer.observe(area, { childList: true, subtree: true });
});
