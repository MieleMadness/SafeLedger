'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const status = require('./status');
const detailActions = require('./detail-actions');
const passwordSettingsUi = require('./password-settings-ui');
const securityEnhancements = require('./security-enhancements');
const settingsSchema = require('./settings-schema');
const backupHealth = require('./backup-health');
const { BRUTE_FORCE_MIN, BRUTE_FORCE_MAX, clampBruteForceValue, normalizeAppearance } = settingsSchema;

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
  input.addEventListener('blur', () => { input.value = String(clampBruteForceValue(input.value)); });
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
function addAppearanceOption(host, value, title, description, selected) {
  const label = document.createElement('label');
  label.className = 'appearance-option';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'safeLedgerAppearance';
  input.value = value;
  input.checked = selected === value;
  label.appendChild(input);
  const strong = document.createElement('strong');
  strong.textContent = title;
  label.appendChild(strong);
  const note = document.createElement('span');
  note.textContent = description;
  label.appendChild(note);
  host.appendChild(label);
  return input;
}
function addStatusLine(section, labelText, initial = 'Checking…') {
  const p = document.createElement('p');
  p.className = 'detail-info-line device-security-status-line';
  const strong = document.createElement('b');
  strong.textContent = `${labelText}: `;
  p.appendChild(strong);
  const value = document.createElement('span');
  value.textContent = initial;
  p.appendChild(value);
  section.appendChild(p);
  return value;
}
function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
function formatAge(entry) {
  if (!entry || entry.state === 'never') return 'Never';
  const age = Number(entry.ageDays || 0);
  const suffix = entry.state === 'due' ? ' — due' : '';
  return age === 0 ? `Today${suffix}` : `${age} day${age === 1 ? '' : 's'} ago${suffix}`;
}
async function populateDeviceSecurityStatus(section, params) {
  const storageValue = addStatusLine(section, 'Storage');
  const writableValue = addStatusLine(section, 'SafeLedgerData');
  const freeValue = addStatusLine(section, 'Free space');
  const backupValue = addStatusLine(section, 'Last backup');
  const verifiedValue = addStatusLine(section, 'Last verified backup');

  try {
    const [storage, backupResult] = await Promise.all([
      ipc.invoke('device-storage-health'),
      ipc.invoke('device-backup-health')
    ]);
    storageValue.textContent = storage && storage.connected ? 'Connected' : `Unavailable${storage && storage.reason ? ` (${storage.reason})` : ''}`;
    writableValue.textContent = storage && storage.writable ? 'Writable' : 'Not writable';
    freeValue.textContent = storage ? formatBytes(storage.freeBytes) : 'Unavailable';
    const health = backupResult && backupResult.health ? backupResult.health : backupHealth.summarize(params.settings || {});
    backupValue.textContent = formatAge(health.backup);
    verifiedValue.textContent = formatAge(health.verified);
  } catch (_) {
    storageValue.textContent = 'Status unavailable';
    writableValue.textContent = 'Status unavailable';
    freeValue.textContent = 'Status unavailable';
    const health = backupHealth.summarize(params.settings || {});
    backupValue.textContent = formatAge(health.backup);
    verifiedValue.textContent = formatAge(health.verified);
  }
}
function addBackupReminderControl(section, params) {
  const field = document.createElement('div');
  field.className = 'settings-field';
  const label = document.createElement('label');
  label.className = 'settings-field-label';
  label.htmlFor = 'backupReminderDays';
  label.textContent = 'Backup reminder';
  field.appendChild(label);
  const select = document.createElement('select');
  select.id = 'backupReminderDays';
  select.className = 'form-control';
  const current = backupHealth.normalizeReminderDays(params.settings && params.settings.backupReminderDays);
  for (const [value, text] of [[0, 'Off'], [90, '3 months'], [180, '6 months'], [365, '12 months']]) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = text;
    option.selected = current === value;
    select.appendChild(option);
  }
  field.appendChild(select);
  section.appendChild(field);
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-default settings-section-save';
  save.textContent = 'Save Backup Reminder';
  save.addEventListener('click', () => {
    if (params.saving.state) return alert('Please wait for processing to complete');
    const backupReminderDays = backupHealth.normalizeReminderDays(select.value);
    save.disabled = true;
    params.saving.state = true;
    status.loadStatus();
    ipc.send('save-settings', { newSettings: Object.assign({}, params.settings, { backupReminderDays }) });
  });
  section.appendChild(save);
}
function showSettings(params) {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  detailActions.clear();
  const header = document.createElement('h1');
  header.textContent = 'Settings';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const appearanceSection = makeSection('Appearance');
  addNote(appearanceSection, 'Choose how SafeLedger looks on this device. Changes are saved automatically. System follows your operating-system light or dark preference.');
  const appearanceOptions = document.createElement('div');
  appearanceOptions.className = 'appearance-options';
  const currentAppearance = normalizeAppearance(params.settings.appearance);
  const system = addAppearanceOption(appearanceOptions, 'system', 'System', 'Follow the operating system and update automatically.', currentAppearance);
  const light = addAppearanceOption(appearanceOptions, 'light', 'Light', 'Bright workspace with SafeLedger blue navigation.', currentAppearance);
  const dark = addAppearanceOption(appearanceOptions, 'dark', 'Dark', 'Low-glare surfaces with deeper blue navigation.', currentAppearance);
  const appearanceInputs = [system, light, dark];
  const saveAppearanceSelection = (event) => {
    const selected = event && event.target;
    if (!selected || selected.checked !== true) return;
    if (params.saving.state) return alert('Please wait for processing to complete');
    const appearance = normalizeAppearance(selected.value);
    if (appearance === currentAppearance) return;
    for (const input of appearanceInputs) input.disabled = true;
    params.saving.state = true;
    status.loadStatus();
    ipc.send('save-settings', { newSettings: Object.assign({}, params.settings, { appearance }) });
  };
  for (const input of appearanceInputs) input.addEventListener('change', saveAppearanceSelection);
  appearanceSection.appendChild(appearanceOptions);
  area.appendChild(appearanceSection);

  const passwordSection = makeSection('Password');
  addNote(passwordSection, 'Change the master password used to unlock your SafeLedger vaults. You will need your current password to complete the change.');
  const changePassword = document.createElement('button');
  changePassword.type = 'button';
  changePassword.className = 'btn btn-default';
  changePassword.innerHTML = '<i class="fa fa-lock" aria-hidden="true"></i> Change Password';
  changePassword.addEventListener('click', () => passwordSettingsUi.show());
  passwordSection.appendChild(changePassword);
  area.appendChild(passwordSection);

  const deviceSection = makeSection('Device & Storage Security');
  addNote(deviceSection, 'SafeLedger automatically locks on supported operating-system security events and if the active SafeLedgerData storage disappears or changes. Device identifiers and backup paths are not stored here.');
  populateDeviceSecurityStatus(deviceSection, params);
  addBackupReminderControl(deviceSection, params);
  area.appendChild(deviceSection);

  const backupSection = makeSection('Backup & Recovery');
  addNote(backupSection, 'Create a complete encrypted backup, verify a backup without changing your data, or restore a previous backup. New backups include SHA-256 integrity hashes for every file.');
  const backupActions = document.createElement('div');
  backupActions.className = 'settings-section-actions';
  const backup = document.createElement('button');
  backup.type = 'button';
  backup.className = 'btn btn-default';
  backup.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i> Backup';
  backup.addEventListener('click', () => securityEnhancements.exportEncryptedBackup());
  backupActions.appendChild(backup);
  const verifyBackup = document.createElement('button');
  verifyBackup.type = 'button';
  verifyBackup.className = 'btn btn-default';
  verifyBackup.innerHTML = '<i class="fa fa-check-circle" aria-hidden="true"></i> Verify Backup';
  verifyBackup.addEventListener('click', () => securityEnhancements.verifyEncryptedBackup());
  backupActions.appendChild(verifyBackup);
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-default';
  restore.innerHTML = '<i class="fa fa-upload" aria-hidden="true"></i> Restore';
  restore.addEventListener('click', () => securityEnhancements.restoreEncryptedBackup());
  backupActions.appendChild(restore);
  backupSection.appendChild(backupActions);
  area.appendChild(backupSection);

  const legacySection = makeSection('Import SafeLedger 1.x Data');
  addNote(legacySection, 'Import profiles from an original SafeLedger 1.x safeledgerdata folder. The importer reads the old files only, creates new 2.x encrypted vault files, verifies the imported structure, and never modifies the original 1.x data.');
  const sourceStatus = document.createElement('p');
  sourceStatus.className = 'settings-section-note';
  sourceStatus.textContent = 'No SafeLedger 1.x folder selected.';
  legacySection.appendChild(sourceStatus);
  const legacyActions = document.createElement('div');
  legacyActions.className = 'settings-section-actions';
  const chooseLegacy = document.createElement('button');
  chooseLegacy.type = 'button';
  chooseLegacy.className = 'btn btn-default';
  chooseLegacy.innerHTML = '<i class="fa fa-folder-open" aria-hidden="true"></i> Choose 1.x Folder';
  legacyActions.appendChild(chooseLegacy);
  legacySection.appendChild(legacyActions);

  const passwordField = document.createElement('div');
  passwordField.className = 'settings-field';
  const legacyPasswordLabel = document.createElement('label');
  legacyPasswordLabel.className = 'settings-field-label';
  legacyPasswordLabel.htmlFor = 'legacyImportPassword';
  legacyPasswordLabel.textContent = 'SafeLedger 1.x master password';
  passwordField.appendChild(legacyPasswordLabel);
  const legacyPassword = document.createElement('input');
  legacyPassword.id = 'legacyImportPassword';
  legacyPassword.type = 'password';
  legacyPassword.className = 'form-control';
  legacyPassword.autocomplete = 'off';
  legacyPassword.maxLength = 512;
  legacyPassword.disabled = true;
  passwordField.appendChild(legacyPassword);
  legacySection.appendChild(passwordField);

  const runLegacyImport = document.createElement('button');
  runLegacyImport.type = 'button';
  runLegacyImport.className = 'btn btn-default settings-section-save';
  runLegacyImport.innerHTML = '<i class="fa fa-exchange" aria-hidden="true"></i> Import 1.x Data';
  runLegacyImport.disabled = true;
  legacySection.appendChild(runLegacyImport);

  chooseLegacy.addEventListener('click', async () => {
    chooseLegacy.disabled = true;
    const result = await securityEnhancements.selectLegacyImportSource();
    chooseLegacy.disabled = false;
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Unable to select SafeLedger 1.x data.');
    sourceStatus.textContent = `Selected: ${result.sourcePath || result.sourceFolder}`;
    legacyPassword.disabled = false;
    runLegacyImport.disabled = !legacyPassword.value;
    legacyPassword.focus();
  });
  legacyPassword.addEventListener('input', () => {
    runLegacyImport.disabled = legacyPassword.disabled || legacyPassword.value.length === 0;
  });
  runLegacyImport.addEventListener('click', async () => {
    if (!legacyPassword.value) return;
    const confirmed = window.confirm('Import the selected SafeLedger 1.x data into this SafeLedger vault? The original 1.x files will remain unchanged.');
    if (!confirmed) return;
    runLegacyImport.disabled = true;
    chooseLegacy.disabled = true;
    legacyPassword.disabled = true;
    const password = legacyPassword.value;
    legacyPassword.value = '';
    const result = await securityEnhancements.importLegacyData(password);
    if (!result || !result.ok) {
      alert(result && result.message ? result.message : 'SafeLedger 1.x import failed.');
      chooseLegacy.disabled = false;
      legacyPassword.disabled = false;
      runLegacyImport.disabled = true;
    }
  });
  area.appendChild(legacySection);

  const bruteSection = makeSection('Brute Force Protection');
  addNote(bruteSection, `Configure how SafeLedger responds to repeated failed login attempts. All brute-force values are limited to whole numbers from ${BRUTE_FORCE_MIN} to ${BRUTE_FORCE_MAX}. Self-destruct protection is optional and can permanently destroy encrypted vault data after all configured lockouts are exhausted.`, 'settings-protection-intro');
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
    ipc.send('save-settings', { newSettings: Object.assign({}, params.settings, { numFailAttempts, numLockoutRetries, minutesToWaitBetweenLockout }) });
  });
  bruteSection.appendChild(save);
  addModified(bruteSection, params.settings.modified);
  area.appendChild(bruteSection);
}

exports.show = showSettings;
exports._test = {
  BRUTE_FORCE_MIN,
  BRUTE_FORCE_MAX,
  clampBruteForceValue,
  configureNumberInput,
  addAppearanceOption,
  formatBytes,
  formatAge,
  addBackupReminderControl
};
