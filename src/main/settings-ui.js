'use strict';

const { ipcRenderer: ipc } = require('electron');
const status = require('./status');
const detailActions = require('./detail-actions');
const encryption = require('./encryption');
const securityEnhancements = require('./security-enhancements');
const settingsSchema = require('./settings-schema');

const { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue } = settingsSchema;

function makeSection(title) {
  const section = document.createElement('section');
  section.className = 'settings-section';
  const heading = document.createElement('h3');
  heading.className = 'settings-section-title';
  heading.textContent = title;
  section.appendChild(heading);
  return section;
}

function addNote(section, text, extraClass = '') {
  const note = document.createElement('p');
  note.className = `settings-section-note settings-section-intro ${extraClass}`.trim();
  note.textContent = text;
  section.appendChild(note);
}

function configureNumberInput(input) {
  input.type = 'number';
  input.className = 'form-control';
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
}

function addNumberField(section, id, labelText, value) {
  const field = document.createElement('div');
  field.className = 'settings-field';
  const label = document.createElement('label');
  label.className = 'settings-field-label';
  label.htmlFor = id;
  label.textContent = labelText;
  field.appendChild(label);
  const input = document.createElement('input');
  input.id = id;
  input.value = String(value);
  configureNumberInput(input);
  field.appendChild(input);
  section.appendChild(field);
  return input;
}

function addModified(section, value) {
  if (!value) return;
  const p = document.createElement('p');
  p.className = 'dates';
  const strong = document.createElement('b');
  strong.textContent = 'Modified: ';
  p.appendChild(strong);
  p.appendChild(document.createTextNode(String(value)));
  section.appendChild(p);
}

function showSettings(params) {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  detailActions.clear();

  const header = document.createElement('h1');
  header.textContent = 'Settings';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const passwordSection = makeSection('Password');
  addNote(passwordSection, 'Change the master password used to unlock your SafeLedger vaults. You will need your current password to complete the change.');
  const changePassword = document.createElement('button');
  changePassword.type = 'button';
  changePassword.className = 'btn btn-default';
  changePassword.innerHTML = '<i class="fa fa-lock" aria-hidden="true"></i> Change Password';
  changePassword.addEventListener('click', () => encryption.showEncrptionDetail());
  passwordSection.appendChild(changePassword);
  area.appendChild(passwordSection);

  const backupSection = makeSection('Backup & Recovery');
  addNote(backupSection, 'Create a complete backup of SafeLedgerData or restore a previous backup. Backups include every profile and local setting, while encrypted vault files remain encrypted.');
  const backupActions = document.createElement('div');
  backupActions.className = 'settings-section-actions';
  const backup = document.createElement('button');
  backup.type = 'button';
  backup.className = 'btn btn-default';
  backup.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i> Backup';
  backup.addEventListener('click', () => securityEnhancements.exportEncryptedBackup());
  backupActions.appendChild(backup);
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-default';
  restore.innerHTML = '<i class="fa fa-upload" aria-hidden="true"></i> Restore';
  restore.addEventListener('click', () => securityEnhancements.restoreEncryptedBackup());
  backupActions.appendChild(restore);
  backupSection.appendChild(backupActions);
  area.appendChild(backupSection);

  const bruteSection = makeSection('Brute Force Protection');
  addNote(
    bruteSection,
    `Configure how SafeLedger responds to repeated failed login attempts. All brute-force values are limited to whole numbers from ${BRUTE_FORCE_MIN} to ${BRUTE_FORCE_MAX}. Self-destruct protection can permanently destroy encrypted vault data after all configured lockouts are exhausted.`,
    'settings-protection-intro'
  );

  const inputFailAttempts = addNumberField(bruteSection, 'inputFailAttempts', 'Failed login attempts before lockout', params.settings.numFailAttempts);
  const inputLockoutRetry = addNumberField(bruteSection, 'inputLockoutRetry', 'Lockouts allowed before self-destruct', params.settings.numLockoutRetries);
  const inputBetweenLockout = addNumberField(bruteSection, 'inputBetweenLockout', 'Lockout duration in minutes', params.settings.minutesToWaitBetweenLockout);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-default settings-section-save';
  save.innerHTML = '<span class="glyphicon glyphicon-save" aria-hidden="true"></span> Save Brute Force Settings';
  save.addEventListener('click', () => {
    if (params.saving.state) return alert('Please wait for processing to complete');

    const numFailAttempts = clampBruteForceValue(inputFailAttempts.value, params.settings.numFailAttempts || 5);
    const numLockoutRetries = clampBruteForceValue(inputLockoutRetry.value, params.settings.numLockoutRetries || 5);
    const minutesToWaitBetweenLockout = clampBruteForceValue(inputBetweenLockout.value, params.settings.minutesToWaitBetweenLockout || 15);

    inputFailAttempts.value = String(numFailAttempts);
    inputLockoutRetry.value = String(numLockoutRetries);
    inputBetweenLockout.value = String(minutesToWaitBetweenLockout);
    save.disabled = true;
    params.saving.state = true;
    status.loadStatus();
    ipc.send('save-settings', {
      newSettings: Object.assign({}, params.settings, {
        numFailAttempts,
        numLockoutRetries,
        minutesToWaitBetweenLockout
      })
    });
  });
  bruteSection.appendChild(save);
  addModified(bruteSection, params.settings.modified);
  area.appendChild(bruteSection);
}

exports.show = showSettings;
exports._test = { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue, configureNumberInput };
