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

function saveUserSetting(params, patch, button) {
  if (params.saving.state) return alert('Please wait for processing to complete');
  if (button) button.disabled = true;
  params.saving.state = true;
  status.loadStatus();
  ipc.send('save-settings', { newSettings: patch });
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
    const backupReminderDays = backupHealth.normalizeReminderDays(select.value);
    saveUserSetting(params, { backupReminderDays }, save);
  });
  section.appendChild(save);
}

function lockIconMarkup() {
  return '<span class="sl-change-password-icon" aria-hidden="true" style="display:inline-flex;width:1.1em;height:1.1em;align-items:center;justify-content:center;margin-right:.35em;vertical-align:-.15em"><svg viewBox="0 0 24 24" width="18" height="18" focusable="false"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15" r="1.35" fill="currentColor"/></svg></span>';
}

function renderAppearanceSection(area, params) {
  const section = makeSection('Appearance');
  addNote(section, 'Choose how SafeLedger looks on this device. Changes are saved automatically. System follows your operating-system light or dark preference.');
  const options = document.createElement('div');
  options.className = 'appearance-options';
  const currentAppearance = normalizeAppearance(params.settings.appearance);
  const inputs = [
    addAppearanceOption(options, 'system', 'System', 'Follow the operating system and update automatically.', currentAppearance),
    addAppearanceOption(options, 'light', 'Light', 'Airy white workspace with soft blue panels and navigation.', currentAppearance),
    addAppearanceOption(options, 'colorful', 'Colorful', 'Classic SafeLedger look with bold blue navigation.', currentAppearance),
    addAppearanceOption(options, 'dark', 'Dark', 'Low-glare surfaces with deeper blue navigation.', currentAppearance)
  ];
  for (const input of inputs) {
    input.addEventListener('change', (event) => {
      const selected = event.target;
      if (!selected || selected.checked !== true) return;
      const appearance = normalizeAppearance(selected.value);
      if (appearance === currentAppearance) return;
      for (const choice of inputs) choice.disabled = true;
      saveUserSetting(params, { appearance });
    });
  }
  section.appendChild(options);
  area.appendChild(section);
}

function renderBackupSection(area) {
  const section = makeSection('Backup & Recovery');
  addNote(section, 'Create a complete encrypted backup, verify a backup without changing your data, or restore a previous backup. New backups include SHA-256 integrity hashes for every file.');
  const actions = document.createElement('div');
  actions.className = 'settings-section-actions';
  const backup = document.createElement('button');
  backup.type = 'button';
  backup.className = 'btn btn-default';
  backup.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i> Backup';
  backup.addEventListener('click', () => securityEnhancements.exportEncryptedBackup());
  actions.appendChild(backup);
  const verify = document.createElement('button');
  verify.type = 'button';
  verify.className = 'btn btn-default';
  verify.innerHTML = '<i class="fa fa-check-circle" aria-hidden="true"></i> Verify Backup';
  verify.addEventListener('click', () => securityEnhancements.verifyEncryptedBackup());
  actions.appendChild(verify);
  const restore = document.createElement('button');
  restore.type = 'button';
  restore.className = 'btn btn-default';
  restore.innerHTML = '<i class="fa fa-upload" aria-hidden="true"></i> Restore';
  restore.addEventListener('click', () => securityEnhancements.restoreEncryptedBackup());
  actions.appendChild(restore);
  section.appendChild(actions);
  area.appendChild(section);
}

function renderDeviceSection(area, params) {
  const section = makeSection('Device & Storage Security');
  addNote(section, 'SafeLedger automatically locks on supported operating-system security events and if the active SafeLedgerData storage disappears or changes. Device identifiers and backup paths are not stored here.');
  populateDeviceSecurityStatus(section, params);
  addBackupReminderControl(section, params);
  area.appendChild(section);
}

function renderLegacyImportSection(area) {
  const section = makeSection('Import SafeLedger 1.x Data');
  addNote(section, 'Import profiles from an original SafeLedger 1.x safeledgerdata folder. The importer reads the old files only, creates new 2.x encrypted vault files, verifies the imported structure, and never modifies the original 1.x data.');
  const sourceStatus = document.createElement('p');
  sourceStatus.className = 'settings-section-note';
  sourceStatus.textContent = 'No SafeLedger 1.x folder selected.';
  section.appendChild(sourceStatus);
  const actions = document.createElement('div');
  actions.className = 'settings-section-actions';
  const choose = document.createElement('button');
  choose.type = 'button';
  choose.className = 'btn btn-default';
  choose.innerHTML = '<i class="fa fa-folder-open" aria-hidden="true"></i> Choose 1.x Folder';
  actions.appendChild(choose);
  section.appendChild(actions);

  const passwordField = document.createElement('div');
  passwordField.className = 'settings-field';
  const label = document.createElement('label');
  label.className = 'settings-field-label';
  label.htmlFor = 'legacyImportPassword';
  label.textContent = 'SafeLedger 1.x master password';
  passwordField.appendChild(label);
  const password = document.createElement('input');
  password.id = 'legacyImportPassword';
  password.type = 'password';
  password.className = 'form-control';
  password.autocomplete = 'off';
  password.maxLength = 512;
  password.disabled = true;
  passwordField.appendChild(password);
  section.appendChild(passwordField);

  const run = document.createElement('button');
  run.type = 'button';
  run.className = 'btn btn-default settings-section-save';
  run.innerHTML = '<i class="fa fa-exchange" aria-hidden="true"></i> Import 1.x Data';
  run.disabled = true;
  section.appendChild(run);

  choose.addEventListener('click', async () => {
    choose.disabled = true;
    const result = await securityEnhancements.selectLegacyImportSource();
    choose.disabled = false;
    if (!result || result.canceled) return;
    if (!result.ok) return alert(result.message || 'Unable to select SafeLedger 1.x data.');
    sourceStatus.textContent = `Selected: ${result.sourcePath || result.sourceFolder}`;
    password.disabled = false;
    run.disabled = !password.value;
    password.focus();
  });
  password.addEventListener('input', () => {
    run.disabled = password.disabled || password.value.length === 0;
  });
  run.addEventListener('click', async () => {
    if (!password.value) return;
    const confirmed = window.confirm('Import the selected SafeLedger 1.x data into this SafeLedger vault? The original 1.x files will remain unchanged.');
    if (!confirmed) return;
    run.disabled = true;
    choose.disabled = true;
    password.disabled = true;
    const suppliedPassword = password.value;
    password.value = '';
    const result = await securityEnhancements.importLegacyData(suppliedPassword);
    if (!result || !result.ok) {
      alert(result && result.message ? result.message : 'SafeLedger 1.x import failed.');
      choose.disabled = false;
      password.disabled = false;
      run.disabled = true;
    }
  });
  area.appendChild(section);
}

function renderBruteForceSection(area, params) {
  const section = makeSection('Brute Force Protection');
  addNote(section, `Configure how SafeLedger responds to repeated failed login attempts. All brute-force values are limited to whole numbers from ${BRUTE_FORCE_MIN} to ${BRUTE_FORCE_MAX}. Self-destruct protection is optional and can permanently destroy encrypted vault data after all configured lockouts are exhausted.`, 'settings-protection-intro');
  const inputFailAttempts = addNumberField(section, 'inputFailAttempts', 'Failed login attempts before lockout', params.settings.numFailAttempts);
  const inputLockoutRetry = addNumberField(section, 'inputLockoutRetry', 'Lockouts allowed before self-destruct', params.settings.numLockoutRetries);
  const inputBetweenLockout = addNumberField(section, 'inputBetweenLockout', 'Lockout duration in minutes', params.settings.minutesToWaitBetweenLockout);
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-default settings-section-save';
  save.innerHTML = '<span class="glyphicon glyphicon-save" aria-hidden="true"></span> Save Brute Force Settings';
  save.addEventListener('click', () => {
    const numFailAttempts = clampBruteForceValue(inputFailAttempts.value, params.settings.numFailAttempts || 5);
    const numLockoutRetries = clampBruteForceValue(inputLockoutRetry.value, params.settings.numLockoutRetries || 5);
    const minutesToWaitBetweenLockout = clampBruteForceValue(inputBetweenLockout.value, params.settings.minutesToWaitBetweenLockout || 15);
    inputFailAttempts.value = String(numFailAttempts);
    inputLockoutRetry.value = String(numLockoutRetries);
    inputBetweenLockout.value = String(minutesToWaitBetweenLockout);
    saveUserSetting(params, { numFailAttempts, numLockoutRetries, minutesToWaitBetweenLockout }, save);
  });
  section.appendChild(save);
  addModified(section, params.settings.modified);
  area.appendChild(section);
}

function renderSelfDestructSection(area, params) {
  const section = makeSection('Self-Destruct Protection');
  section.id = 'selfDestructSettingsSection';
  addNote(section, 'Optional protection for high-risk situations. When enabled, SafeLedger permanently destroys the encrypted vault files after all configured failed-login lockouts are exhausted.');
  const warning = document.createElement('div');
  warning.className = 'settings-protection-note';
  warning.textContent = 'This can permanently destroy your SafeLedger vault data. Keep a verified backup on separate storage before enabling it.';
  section.appendChild(warning);
  const label = document.createElement('label');
  label.className = 'privacy-mode-toggle settings-field-label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'selfDestructProtectionEnabled';
  checkbox.checked = params.settings.scrubContentAfterRetries === true;
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(' Enable Self-Destruct Protection'));
  section.appendChild(label);
  checkbox.addEventListener('change', async () => {
    const previous = params.settings.scrubContentAfterRetries === true;
    const desired = checkbox.checked === true;
    checkbox.disabled = true;
    try {
      if (!window.safeLedgerApi || typeof window.safeLedgerApi.setSelfDestructProtection !== 'function') throw new Error('Self-Destruct settings are unavailable in this build.');
      const result = await window.safeLedgerApi.setSelfDestructProtection(desired);
      checkbox.checked = result && result.enabled === true;
    } catch (err) {
      checkbox.checked = previous;
      window.alert(err && err.message ? err.message : 'Unable to update Self-Destruct Protection.');
    } finally {
      checkbox.disabled = false;
    }
  });
  area.appendChild(section);
}

function renderAssetDisplaySection(area, params) {
  const section = makeSection('Asset Display');
  section.classList.add('shit-coin-mode-section');
  addNote(section, 'Shit Coin Mode is a visual-only joke setting. When enabled, assets that do not have a recognized local SafeLedger icon use a 💩 emoji instead of the generic ticker fallback. It never changes, ranks, deletes, filters, or classifies your assets.');
  const label = document.createElement('label');
  label.className = 'privacy-mode-toggle settings-field-label shit-coin-mode-option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'shitCoinMode';
  input.checked = params.settings.shitCoinMode === true;
  label.appendChild(input);
  label.appendChild(document.createTextNode(' Enable Shit Coin Mode'));
  section.appendChild(label);
  const save = document.createElement('button');
  save.type = 'button';
  save.id = 'saveShitCoinMode';
  save.className = 'btn btn-default settings-section-save';
  save.textContent = 'Save Shit Coin Mode';
  save.addEventListener('click', () => saveUserSetting(params, { shitCoinMode: input.checked === true }, save));
  section.appendChild(save);
  area.appendChild(section);
}

function renderPrivacySection(area, params) {
  const section = makeSection('Privacy Mode');
  section.id = 'privacyModeSection';
  addNote(section, 'When enabled, sensitive values stay collapsed and their Copy/QR shortcuts remain hidden until you deliberately reveal the field. Public addresses and recovery-health metadata remain usable.');
  const label = document.createElement('label');
  label.className = 'privacy-mode-toggle settings-field-label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'privacyModeEnabled';
  checkbox.checked = params.settings.privacyMode !== false;
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(' Enable Privacy Mode'));
  section.appendChild(label);
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-default settings-section-save';
  save.textContent = 'Save Privacy Mode';
  save.addEventListener('click', () => saveUserSetting(params, { privacyMode: checkbox.checked === true }, save));
  section.appendChild(save);
  area.appendChild(section);
}

function renderPasswordSection(area) {
  const section = makeSection('Password');
  addNote(section, 'Change the master password used to unlock your SafeLedger vaults. You will need your current password to complete the change.');
  const changePassword = document.createElement('button');
  changePassword.type = 'button';
  changePassword.className = 'btn btn-default';
  changePassword.innerHTML = `${lockIconMarkup()}Change Password`;
  changePassword.addEventListener('click', () => passwordSettingsUi.show());
  section.appendChild(changePassword);
  area.appendChild(section);
}

function showSettings(params) {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  detailActions.clear();
  const header = document.createElement('h1');
  header.textContent = 'Settings';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  // One canonical Settings render owns both section creation and ordering.
  renderAppearanceSection(area, params);
  renderBackupSection(area);
  renderDeviceSection(area, params);
  renderLegacyImportSection(area);
  renderBruteForceSection(area, params);
  renderSelfDestructSection(area, params);
  renderAssetDisplaySection(area, params);
  renderPrivacySection(area, params);
  renderPasswordSection(area);
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
  addBackupReminderControl,
  saveUserSetting,
  lockIconMarkup,
  renderSelfDestructSection,
  renderAssetDisplaySection,
  renderPrivacySection
};