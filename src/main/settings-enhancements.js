'use strict';

const { ipcRenderer: ipc } = require('electron');

const BRUTE_FORCE_MIN = 1;
const BRUTE_FORCE_MAX = 99;
let latestSettings = null;

function rememberSettings(params) {
  if (params && params.settings) latestSettings = Object.assign({}, params.settings);
}

ipc.on('result-init-system', (_event, params) => rememberSettings(params));
ipc.on('result', (_event, params) => rememberSettings(params));
ipc.on('result-save-settings', (_event, params) => rememberSettings(params));
ipc.on('result-lockout-destroy', (_event, params) => rememberSettings(params));

function clampBruteForceValue(value, fallback = BRUTE_FORCE_MIN) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(BRUTE_FORCE_MAX, Math.max(BRUTE_FORCE_MIN, parsed));
}

function configureBruteForceInput(input) {
  input.min = String(BRUTE_FORCE_MIN);
  input.max = String(BRUTE_FORCE_MAX);
  input.step = '1';
  input.inputMode = 'numeric';

  const clampCurrent = () => {
    if (input.value === '') return;
    input.value = String(clampBruteForceValue(input.value));
  };
  input.addEventListener('input', clampCurrent);
  input.addEventListener('change', clampCurrent);
  input.addEventListener('blur', () => {
    input.value = String(clampBruteForceValue(input.value));
  });
  clampCurrent();
}

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

function makeField(labelText, input) {
  const field = document.createElement('div');
  field.className = 'settings-field';
  const label = document.createElement('div');
  label.className = 'settings-field-label';
  label.textContent = labelText;
  field.appendChild(label);
  field.appendChild(input);
  return field;
}

function enhanceSettingsScreen() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  if (!header || header.textContent.trim() !== 'Settings') return;
  if (area.querySelector('.settings-section')) return;

  const form = area.querySelector('form');
  if (!form) return;

  const inputFailAttempts = form.querySelector('#inputFailAttempts');
  const inputLockoutRetry = form.querySelector('#inputLockoutRetry');
  const inputBetweenLockout = form.querySelector('#inputBetweenLockout');
  const legacySave = form.querySelector('#saveBtn');
  if (!inputFailAttempts || !inputLockoutRetry || !inputBetweenLockout || !legacySave) return;

  configureBruteForceInput(inputFailAttempts);
  configureBruteForceInput(inputLockoutRetry);
  configureBruteForceInput(inputBetweenLockout);

  // Clone the base renderer button to keep only the current 1-99 validation
  // policy used by this Settings screen.
  const save = legacySave.cloneNode(true);

  form.innerHTML = '';
  form.className = 'settings-brute-form';

  const protectionIntro = document.createElement('p');
  protectionIntro.className = 'settings-section-note settings-section-intro settings-protection-intro';
  protectionIntro.textContent = 'Configure how SafeLedger responds to repeated failed login attempts. All brute-force values are limited to whole numbers from 1 to 99. Self-destruct protection can permanently destroy encrypted vault data after all configured lockouts are exhausted.';

  form.appendChild(makeField('Failed login attempts before lockout', inputFailAttempts));
  form.appendChild(makeField('Lockouts allowed before self-destruct', inputLockoutRetry));
  form.appendChild(makeField('Lockout duration in minutes', inputBetweenLockout));

  const saveBruteForceSettings = (event) => {
    if (event) event.preventDefault();
    if (!latestSettings) {
      alert('SafeLedger settings are still loading. Please try again.');
      return;
    }

    const numFailAttempts = clampBruteForceValue(inputFailAttempts.value, latestSettings.numFailAttempts || 5);
    const numLockoutRetries = clampBruteForceValue(inputLockoutRetry.value, latestSettings.numLockoutRetries || 5);
    const minutesToWaitBetweenLockout = clampBruteForceValue(inputBetweenLockout.value, latestSettings.minutesToWaitBetweenLockout || 15);

    inputFailAttempts.value = String(numFailAttempts);
    inputLockoutRetry.value = String(numLockoutRetries);
    inputBetweenLockout.value = String(minutesToWaitBetweenLockout);

    save.disabled = true;
    ipc.send('save-settings', {
      newSettings: Object.assign({}, latestSettings, {
        numFailAttempts,
        numLockoutRetries,
        minutesToWaitBetweenLockout
      })
    });
  };

  save.type = 'submit';
  save.classList.remove('pull-right');
  save.classList.add('settings-section-save');
  save.innerHTML = '<span class="glyphicon glyphicon-save" aria-hidden="true"></span> Save Brute Force Settings';
  save.addEventListener('click', saveBruteForceSettings);
  form.addEventListener('submit', saveBruteForceSettings);
  form.appendChild(save);

  const passwordSection = makeSection('Password');
  const passwordNote = document.createElement('p');
  passwordNote.className = 'settings-section-note settings-section-intro';
  passwordNote.textContent = 'Change the master password used to unlock your SafeLedger vaults. You will need your current password to complete the change.';
  passwordSection.appendChild(passwordNote);

  const changePassword = document.createElement('button');
  changePassword.type = 'button';
  changePassword.className = 'btn btn-default';
  changePassword.innerHTML = '<i class="fa fa-lock"></i> Change Password';
  changePassword.addEventListener('click', () => clickLegacyAction('encryptionSettings'));
  passwordSection.appendChild(changePassword);

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

  const bruteSection = makeSection('Brute Force Protection');
  bruteSection.appendChild(protectionIntro);

  area.insertBefore(passwordSection, form);
  area.insertBefore(backupSection, form);
  area.insertBefore(bruteSection, form);
  bruteSection.appendChild(form);

  const modified = Array.from(area.querySelectorAll('p.dates')).find((p) => /modified/i.test(p.textContent || ''));
  if (modified) bruteSection.appendChild(modified);
}

window.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('detailArea');
  if (!area) return;
  enhanceSettingsScreen();
  const observer = new MutationObserver(() => enhanceSettingsScreen());
  observer.observe(area, { childList: true, subtree: true });
});

exports._test = { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue, configureBruteForceInput };
