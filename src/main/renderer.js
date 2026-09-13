'use strict';

// SafeLedger trusted UI coordinator. Persistent state belongs to the main
// process; renderer-state.js is the sole owner of transient workspace/session
// state shared by renderer modules.

const services = require('./renderer-services');
const rendererState = require('./renderer-state');
const profile = require('./profile');
const group = require('./group');
const record = require('./record');
const status = require('./status');
const settingsUi = require('./settings-ui');
const securityUi = require('./security-ui');
const detailActions = require('./detail-actions');
const globalSearchUi = require('./global-search-ui');
const dashboardUi = require('./dashboard-ui');
const columnCollapseUi = require('./column-collapse-ui');
const passwordControls = require('./password-controls');
const loginLayout = require('./login-layout-ui');
const displayPreferences = require('./display-preferences');
const cryptoUi = require('./crypto-ui-bridge');
const securityEnhancements = require('./security-enhancements');
const lockoutUi = require('./lockout-ui-enhancements');
const topActionLockUi = require('./top-action-lock-ui');

const state = rendererState.state;
let pendingGlobalTarget = null;
let revealWorkspaceAfterRead = false;

function applySettings(nextSettings) {
  rendererState.setSettings(nextSettings);
  securityUi.setPrivacyMode(!state.settings || state.settings.privacyMode !== false);
  displayPreferences.setSettings(state.settings || {});
  lockoutUi.handleSecurityResult({ settings: state.settings });
}

function requireUnlocked(action) {
  if (!state.sessionUnlocked) {
    status.showStatus({ status: 'ERROR', statusMsg: 'Please login.' });
    return false;
  }
  action();
  return true;
}

function profileParams(extra = {}) {
  return Object.assign({ vaultList: state.vaultList, saving: state.saving, onResult: handleResult }, extra);
}

function workspaceParams(extra = {}) {
  return Object.assign({ vaultData: state.vaultData, saving: state.saving, onResult: handleResult }, extra);
}

function selectedProfile() {
  if (!state.vaultList || !Array.isArray(state.vaultList.vaults)) return null;
  if (state.vaultList.vaultSelected == null || state.vaultList.vaultSelected === '') return null;
  const index = Number(state.vaultList.vaultSelected);
  if (!Number.isInteger(index) || index < 0 || index >= state.vaultList.vaults.length) return null;
  return state.vaultList.vaults[index] || null;
}

function selectedVaultItem() {
  if (!state.vaultData || !Array.isArray(state.vaultData.groups)) return null;
  if (state.vaultData.groupSelected == null || state.vaultData.groupSelected === '') return null;
  const index = Number(state.vaultData.groupSelected);
  if (!Number.isInteger(index) || index < 0 || index >= state.vaultData.groups.length) return null;
  return state.vaultData.groups[index] || null;
}

function firstDisplayProfileIndex(list = state.vaultList) {
  if (!list || !Array.isArray(list.vaults) || !list.vaults.length) return null;
  const ordered = list.vaults.map((item, index) => ({ item, index })).sort((a, b) => {
    const aPinned = a.item && a.item.pinned === true;
    const bPinned = b.item && b.item.pinned === true;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return String(a.item && a.item.name || '').localeCompare(String(b.item && b.item.name || ''), undefined, { sensitivity: 'base' });
  });
  return ordered[0].index;
}

function showSelectedProfileDetail() {
  const selected = selectedProfile();
  if (!selected) return showAfterLogin();
  if (state.vaultData) {
    state.vaultData.groupSelected = null;
    state.vaultData.recordSelected = null;
    group.listGroups(workspaceParams());
  }
  const recordArea = document.getElementById('recordArea');
  if (recordArea) recordArea.innerHTML = '';
  profile.showProfileDetail(profileParams({ profile: selected }));
}

function showSelectedVaultItemDetail() {
  const selected = selectedVaultItem();
  if (!selected) return showSelectedProfileDetail();
  state.vaultData.recordSelected = null;
  group.listGroups(workspaceParams());
  record.listRecords(workspaceParams());
  group.showGroupDetail(workspaceParams({ group: selected }));
}

function clearUtilitySelections() {
  if (state.vaultList) {
    state.vaultList.vaultSelected = null;
    profile.listProfiles(profileParams());
  }
  if (state.vaultData) {
    state.vaultData.groupSelected = null;
    state.vaultData.recordSelected = null;
  }
  const groupArea = document.getElementById('groupArea');
  const recordArea = document.getElementById('recordArea');
  if (groupArea) groupArea.innerHTML = '';
  if (recordArea) recordArea.innerHTML = '';
}

function cancelAddProfile() {
  clearUtilitySelections();
  dashboardUi.show();
}

function navigateGlobalResult(target = {}) {
  if (!state.sessionUnlocked || !state.vaultList || !Array.isArray(state.vaultList.vaults)) return;
  let profileIndex = Number(target.profileIndex);
  if (!Number.isInteger(profileIndex) || profileIndex < 0 || profileIndex >= state.vaultList.vaults.length) {
    profileIndex = state.vaultList.vaults.findIndex((item) => String(item && item.file || '') === String(target.profileFile || ''));
  }
  if (profileIndex < 0) {
    const unavailable = target.source === 'dashboard'
      ? 'That vault item is no longer available.'
      : 'That search result is no longer available.';
    return status.showStatus({ status: 'ERROR', statusMsg: unavailable });
  }

  const selectedProfileItem = state.vaultList.vaults[profileIndex];
  pendingGlobalTarget = target;
  state.vaultList.vaultSelected = profileIndex;
  profile.listProfiles(profileParams());
  profile.showProfileDetail(profileParams({ profile: selectedProfileItem }));
  state.saving.state = true;
  status.loadStatus();
  services.deliver(services.readProfile(selectedProfileItem.file), handleResult, 'Unable to load Profile.');
}

function refreshSearch(key) {
  if (key === 'profile') {
    if (state.vaultList) profile.listProfiles(profileParams());
    return;
  }
  if (key === 'vault') {
    group.listGroups(workspaceParams());
    return;
  }
  if (key === 'asset') record.listRecords(workspaceParams());
}

function setupSearchClear(inputId, buttonId, key) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;
  const sync = () => { button.style.visibility = input.value ? 'visible' : 'hidden'; };
  input.addEventListener('input', sync);
  button.addEventListener('click', () => {
    input.value = '';
    sync();
    input.focus();
    refreshSearch(key);
  });
  sync();
}

function handleResult(params = {}) {
  state.saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.sessionUnlocked === true) {
    rendererState.setUnlocked(true);
    securityEnhancements.setSessionUnlocked(true);
  }
  if (params.type === 'session-locked') {
    rendererState.setUnlocked(false);
    securityEnhancements.setSessionUnlocked(false);
    revealWorkspaceAfterRead = false;
    pendingGlobalTarget = null;
    globalSearchUi.close();
    columnCollapseUi.collapseForLogin();
  }

  if (params.settings) {
    applySettings(params.settings);
    if (state.settings.lockLogin) {
      const unlockAt = state.settings.lockLoginTime + (state.settings.minutesToWaitBetweenLockout * 60000);
      if (unlockAt > Date.now()) {
        rendererState.setUnlocked(false);
        securityEnhancements.setSessionUnlocked(false);
        showLockScreen();
        return;
      }
    }
  }

  if (params.type === 'vault-delete' && state.vaultList) {
    if (params.vaultList) rendererState.setVaultList(params.vaultList);
    else state.vaultList.vaultSelected = null;
    rendererState.setVaultData(null);
    document.getElementById('groupArea').innerHTML = '';
    document.getElementById('recordArea').innerHTML = '';
    profile.listProfiles(profileParams());
    showAfterLogin();
  }

  const recordArea = document.getElementById('recordArea');
  if (params.vaultList) {
    rendererState.setVaultList(params.vaultList);
    if (params.type === 'vaultlist-init') {
      rendererState.setUnlocked(true);
      securityEnhancements.setSessionUnlocked(true);
      const firstIndex = firstDisplayProfileIndex(state.vaultList);
      state.vaultList.vaultSelected = firstIndex;
      profile.listProfiles(profileParams());
      if (firstIndex != null) {
        const firstProfile = state.vaultList.vaults[firstIndex];
        profile.showProfileDetail(profileParams({ profile: firstProfile }));
        revealWorkspaceAfterRead = true;
        state.saving.state = true;
        status.loadStatus();
        services.deliver(services.readProfile(firstProfile.file), handleResult, 'Unable to load Profile.');
      } else {
        revealWorkspaceAfterRead = false;
        showAfterLogin();
        columnCollapseUi.revealAfterLogin();
      }
    } else {
      profile.listProfiles(profileParams());
      if (params.type === 'vault-create') {
        document.getElementById('groupArea').innerHTML = '';
        recordArea.innerHTML = '';
      }
      if (state.vaultList.vaultSelected != null) {
        const selected = state.vaultList.vaults[state.vaultList.vaultSelected];
        if (selected) profile.showProfileDetail(profileParams({ profile: selected }));
      } else if (params.type !== 'vault-delete') {
        showAfterLogin();
      }
    }
  }

  if (params.vaultData) {
    rendererState.setVaultData(params.vaultData);
    if (['vault-create', 'vault-read', 'group-delete'].includes(params.type)) {
      state.vaultData.groupSelected = null;
      state.vaultData.recordSelected = null;
      recordArea.innerHTML = '';
    }
    group.listGroups(workspaceParams());

    if (params.type === 'vault-read' && pendingGlobalTarget) {
      const target = pendingGlobalTarget;
      pendingGlobalTarget = null;
      if (target.type === 'wallet' || target.type === 'asset') {
        const groupIndex = Number(target.walletIndex);
        if (Number.isInteger(groupIndex) && state.vaultData.groups && state.vaultData.groups[groupIndex]) {
          state.vaultData.groupSelected = groupIndex;
          const selectedGroup = state.vaultData.groups[groupIndex];
          group.listGroups(workspaceParams());
          record.listRecords(workspaceParams());
          if (target.type === 'asset') {
            const recordIndex = Number(target.recordIndex);
            if (Number.isInteger(recordIndex) && selectedGroup.records && selectedGroup.records[recordIndex]) {
              state.vaultData.recordSelected = recordIndex;
              record.listRecords(workspaceParams());
              record.showRecordDetail(workspaceParams({ record: selectedGroup.records[recordIndex] }));
            } else group.showGroupDetail(workspaceParams({ group: selectedGroup }));
          } else group.showGroupDetail(workspaceParams({ group: selectedGroup }));
        }
      }
    }

    if (params.type === 'group-create' || params.type === 'group-modify') {
      if (state.vaultData.groupSelected != null) {
        const selected = state.vaultData.groups[state.vaultData.groupSelected];
        record.listRecords(workspaceParams());
        if (selected) group.showGroupDetail(workspaceParams({ group: selected }));
      }
    }

    if (params.type === 'record' && state.vaultData.groupSelected != null) {
      const selectedGroup = state.vaultData.groups[state.vaultData.groupSelected];
      if (selectedGroup && Array.isArray(selectedGroup.records)) {
        record.listRecords(workspaceParams());
        if (state.vaultData.recordSelected != null) {
          const selectedRecord = selectedGroup.records[state.vaultData.recordSelected];
          if (selectedRecord) record.showRecordDetail(workspaceParams({ record: selectedRecord }));
        }
      }
    }
  }

  if (params.type === 'vault-read' && revealWorkspaceAfterRead) {
    revealWorkspaceAfterRead = false;
    columnCollapseUi.revealAfterLogin();
  }
}

function handleInitSystem(params = {}) {
  state.saving.state = false;
  rendererState.setUnlocked(false);
  securityEnhancements.setSessionUnlocked(false);
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) {
    applySettings(params.settings);
    if (state.settings.lockLogin) {
      const unlockAt = state.settings.lockLoginTime + (state.settings.minutesToWaitBetweenLockout * 60000);
      if (unlockAt > Date.now()) {
        showLockScreen();
        return;
      }
    }
  }
  showLogin();
}

function initializeSystem() {
  services.deliver(services.initializeSystem(), handleInitSystem, 'Not able to load settings file');
}

function handlePasswordChanged() {
  rendererState.setUnlocked(true);
  securityEnhancements.setSessionUnlocked(true);
  if (state.vaultList) profile.listProfiles(profileParams());
  showAfterLogin();
}

const showAfterLogin = () => {
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Welcome to SafeLedger';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const text = document.createElement('p');
  text.textContent = 'Please select a profile';
  area.appendChild(text);
};

const showLogin = () => {
  rendererState.setUnlocked(false);
  securityEnhancements.setSessionUnlocked(false);
  revealWorkspaceAfterRead = false;
  pendingGlobalTarget = null;
  globalSearchUi.close();
  columnCollapseUi.collapseForLogin();
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Welcome to SafeLedger';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const form = document.createElement('form');
  area.appendChild(form);
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group';
  form.appendChild(formGroup);
  const label = document.createElement('label');
  label.htmlFor = 'masterCryptoInput';
  label.textContent = 'Password';
  formGroup.appendChild(label);
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'form-control';
  input.id = 'masterCryptoInput';
  input.maxLength = 128;
  input.autocomplete = 'off';
  formGroup.appendChild(input);

  for (const message of [
    'Must be at least 8 characters long.',
    'Must contain at least one uppercase letter.',
    'Must contain one lowercase letter.',
    'Must contain at least one number'
  ]) {
    const p = document.createElement('p');
    p.textContent = message;
    area.appendChild(p);
  }

  const loginBtn = document.createElement('button');
  loginBtn.type = 'submit';
  loginBtn.id = 'loginBtn';
  loginBtn.className = 'btn btn-default bottom-space pull-right';
  loginBtn.innerHTML = '<i class="fa fa-unlock"></i> Login';
  form.appendChild(loginBtn);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    cryptoUi.handleLogin(loginBtn);
  });

  passwordControls.configure(input, { autocomplete: 'off', strength: true });
  loginLayout.syncLoginControlWidths();
};

function openSettings() {
  if (!state.sessionUnlocked || !state.settings) return;
  clearUtilitySelections();
  settingsUi.show({ settings: state.settings, saving: state.saving, onResult: handleSaveSettings });
}

function handleSaveSettings(params = {}) {
  state.saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) applySettings(params.settings);
  if (state.settings && state.sessionUnlocked) settingsUi.show({ settings: state.settings, saving: state.saving, onResult: handleSaveSettings });
}

const showLockScreen = () => {
  rendererState.setUnlocked(false);
  securityEnhancements.setSessionUnlocked(false);
  revealWorkspaceAfterRead = false;
  pendingGlobalTarget = null;
  globalSearchUi.close();
  columnCollapseUi.collapseForLogin();
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = `Account is locked for ${state.settings.minutesToWaitBetweenLockout} minutes.`;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const retry = document.createElement('p');
  const unlockAt = new Date(state.settings.lockLoginTime + (state.settings.minutesToWaitBetweenLockout * 60000));
  retry.textContent = `Try again after ${unlockAt}`;
  area.appendChild(retry);
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'saveBtn';
  button.className = 'btn btn-default bottom-space pull-right';
  button.innerHTML = '<span class="fa fa-unlock" aria-hidden="true"></span> Retry Login';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.saving.state) return alert('Please wait for processing to complete');
    const unlockTime = state.settings.lockLoginTime + (state.settings.minutesToWaitBetweenLockout * 60000);
    if (state.settings.lockLogin && unlockTime > Date.now()) alert('Lock timeout is still active');
    else showLogin();
  });
  area.appendChild(button);
};

function handleLockoutDestroy(params = {}) {
  state.saving.state = false;
  rendererState.clearWorkspace();
  securityEnhancements.setSessionUnlocked(false);
  revealWorkspaceAfterRead = false;
  pendingGlobalTarget = null;
  globalSearchUi.close();
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) applySettings(params.settings);
  showLockoutDestroy();
}

const showLockoutDestroy = () => {
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'System lockout';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const text = document.createElement('p');
  const strong = document.createElement('b');
  strong.textContent = 'You have exceeded your password attempts and SafeLedger self-destruct protection has destroyed the encrypted vault data. The next login will create a new initial system setup.';
  text.appendChild(strong);
  area.appendChild(text);
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'saveBtn';
  button.className = 'btn btn-default bottom-space pull-right';
  button.innerHTML = '<span class="fa fa-unlock" aria-hidden="true"></span> Go to Login';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (!state.saving.state) showLogin();
  });
  area.appendChild(button);
};

globalSearchUi.configure({ isUnlocked: () => state.sessionUnlocked, onSelect: navigateGlobalResult });
dashboardUi.configure({ onOpenWallet: navigateGlobalResult });
columnCollapseUi.configure({ onSearchClear: refreshSearch });
cryptoUi.configure({ onCommandResult: handleResult, onPasswordChanged: handlePasswordChanged });
topActionLockUi.configure({ onOpenLogin: initializeSystem });

window.addEventListener('DOMContentLoaded', () => {
  const addVault = document.getElementById('addVault');
  const addGroup = document.getElementById('addGroup');
  const addRecord = document.getElementById('addRecord');
  const profileSearch = document.getElementById('profileSearch');
  const groupSearch = document.getElementById('groupSearch');
  const recordSearch = document.getElementById('recordSearch');
  const dashboardButton = document.getElementById('dashboardButton');
  const settingsButton = document.getElementById('settingsButton');

  initializeSystem();

  addVault.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (state.vaultList) profile.createProfile(profileParams({ onCancel: cancelAddProfile }));
      else status.showStatus({ status: 'ERROR', statusMsg: 'Vault list is empty' });
    });
  });

  addGroup.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (selectedProfile()) group.createGroup(workspaceParams({ onCancel: showSelectedProfileDetail }));
      else status.showStatus({ status: 'ERROR', statusMsg: 'Please select a Profile.' });
    });
  });

  addRecord.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (!selectedVaultItem()) {
        status.showStatus({ status: 'INFO', statusMsg: 'Select a Vault Item first, then choose Add Asset.' });
        return;
      }
      record.createRecord(workspaceParams({ onCancel: showSelectedVaultItemDetail }));
    });
  });

  profileSearch.addEventListener('keyup', (event) => { event.preventDefault(); refreshSearch('profile'); });
  groupSearch.addEventListener('keyup', (event) => { event.preventDefault(); refreshSearch('vault'); });
  recordSearch.addEventListener('keyup', (event) => { event.preventDefault(); refreshSearch('asset'); });
  setupSearchClear('profileSearch', 'profileSearchClear', 'profile');
  setupSearchClear('groupSearch', 'groupSearchClear', 'vault');
  setupSearchClear('recordSearch', 'recordSearchClear', 'asset');
  if (dashboardButton) dashboardButton.addEventListener('click', clearUtilitySelections);
  if (settingsButton) settingsButton.addEventListener('click', (event) => {
    event.preventDefault();
    openSettings();
  });
});

window.addEventListener('resize', () => loginLayout.syncLoginControlWidths());

services.onLockoutDestroy((params) => handleLockoutDestroy(params || {}));
services.onSecuritySessionLocked((payload) => {
  rendererState.setUnlocked(false);
  securityEnhancements.handleSecuritySessionLocked(payload || {});
});
services.onShowSettings(() => openSettings());

exports._test = {
  navigateGlobalResult,
  applySettings,
  selectedProfile,
  selectedVaultItem,
  firstDisplayProfileIndex,
  refreshSearch,
  setupSearchClear,
  showSelectedProfileDetail,
  showSelectedVaultItemDetail,
  handleResult,
  handleInitSystem,
  openSettings
};
