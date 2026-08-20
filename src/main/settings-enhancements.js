'use strict';

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
  backup.innerHTML = '<i class="fa fa-download"></i> Backup All SafeLedger Data';
  backup.addEventListener('click', () => clickLegacyAction('backupButton'));
  actions.appendChild(backup);

  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-default';
  restore.innerHTML = '<i class="fa fa-upload"></i> Restore All SafeLedger Data';
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
