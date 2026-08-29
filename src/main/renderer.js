'use strict';

// SafeLedger trusted UI module. This file is loaded by the browser renderer
// bundle; Electron/Node capabilities are provided only through the narrow
// safeLedgerApi preload bridge.

const { ipcRenderer: ipc } = require('./renderer-bridge');
const profile = require('./profile');
const group = require('./group');
const record = require('./record');
const status = require('./status');
const settingsUi = require('./settings-ui');
const securityUi = require('./security-ui');
const detailActions = require('./detail-actions');
const globalSearchUi = require('./global-search-ui');

let vaultData;
let vaultList;
let sessionUnlocked = false;
const saving = { state: false };
let settings;
let pendingGlobalTarget = null;

function applySettings(nextSettings) {
  settings = nextSettings;
  securityUi.setPrivacyMode(!settings || settings.privacyMode !== false);
}

function requireUnlocked(action) {
  if (!sessionUnlocked) {
    status.showStatus({ status: 'ERROR', statusMsg: 'Please login.' });
    return false;
  }
  action();
  return true;
}

function profileParams(extra = {}) {
  return Object.assign({ vaultList, saving }, extra);
}

function clearUtilitySelections() {
  if (vaultList) {
    vaultList.vaultSelected = null;
    profile.listProfiles(profileParams());
  }
  if (vaultData) {
    vaultData.groupSelected = null;
    vaultData.recordSelected = null;
  }
  document.getElementById('groupArea').innerHTML = '';
  document.getElementById('recordArea').innerHTML = '';
}

function navigateGlobalResult(target = {}) {
  if (!sessionUnlocked || !vaultList || !Array.isArray(vaultList.vaults)) return;
  const profileIndex = vaultList.vaults.findIndex((item) => String(item && item.file || '') === String(target.profileFile || ''));
  if (profileIndex < 0) return status.showStatus({ status: 'ERROR', statusMsg: 'That search result is no longer available.' });
  const selectedProfile = vaultList.vaults[profileIndex];
  pendingGlobalTarget = target;
  vaultList.vaultSelected = profileIndex;
  profile.listProfiles(profileParams());
  profile.showProfileDetail(profileParams({ profile: selectedProfile }));
  saving.state = true;
  status.loadStatus();
  ipc.send('read', { type: 'vault-read', file: selectedProfile.file });
}

globalSearchUi.configure({
  isUnlocked: () => sessionUnlocked,
  onSelect: navigateGlobalResult
});

window.addEventListener('DOMContentLoaded', () => {
  const addVault = document.getElementById('addVault');
  const addGroup = document.getElementById('addGroup');
  const addRecord = document.getElementById('addRecord');
  const profileSearch = document.getElementById('profileSearch');
  const groupSearch = document.getElementById('groupSearch');
  const recordSearch = document.getElementById('recordSearch');

  initSystem();

  addVault.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (vaultList) profile.createProfile(profileParams());
      else status.showStatus({ status: 'ERROR', statusMsg: 'Vault list is empty' });
    });
  });

  addGroup.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (vaultList && vaultList.vaultSelected != null) group.createGroup({ vaultData, saving });
      else status.showStatus({ status: 'ERROR', statusMsg: 'Please select a Profile.' });
    });
  });

  addRecord.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (vaultData && vaultData.groupSelected != null) record.createRecord({ vaultData, saving });
      else status.showStatus({ status: 'ERROR', statusMsg: 'Please select a Wallet.' });
    });
  });

  profileSearch.addEventListener('keyup', (event) => {
    event.preventDefault();
    if (vaultList) profile.listProfiles(profileParams());
  });

  groupSearch.addEventListener('keyup', (event) => {
    event.preventDefault();
    group.listGroups({ vaultData, saving });
  });

  recordSearch.addEventListener('keyup', (event) => {
    event.preventDefault();
    record.listRecords({ vaultData, saving });
  });
});

ipc.on('result', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.sessionUnlocked === true) sessionUnlocked = true;
  if (params.type === 'session-locked') {
    sessionUnlocked = false;
    pendingGlobalTarget = null;
    globalSearchUi.close();
  }

  if (params.settings) {
    applySettings(params.settings);
    if (settings.lockLogin) {
      const unlockAt = settings.lockLoginTime + (settings.minutesToWaitBetweenLockout * 60000);
      if (unlockAt > Date.now()) {
        sessionUnlocked = false;
        showLockScreen();
        return;
      }
    }
  }

  if (params.type === 'vault-delete' && vaultList) {
    vaultList.vaultSelected = null;
    vaultData = undefined;
    document.getElementById('groupArea').innerHTML = '';
    document.getElementById('recordArea').innerHTML = '';
    profile.listProfiles(profileParams());
    showAfterLogin();
  }

  const recordArea = document.getElementById('recordArea');
  if (params.vaultList) {
    if (params.type === 'vaultlist-init') {
      sessionUnlocked = true;
      params.vaultList.vaultSelected = null;
    }
    vaultList = params.vaultList;
    profile.listProfiles(profileParams());
    if (params.type === 'vault-create') {
      document.getElementById('groupArea').innerHTML = '';
      recordArea.innerHTML = '';
    }
    if (vaultList.vaultSelected != null) {
      const selected = vaultList.vaults[vaultList.vaultSelected];
      if (selected) profile.showProfileDetail(profileParams({ profile: selected }));
    } else {
      showAfterLogin();
    }
  }

  if (params.vaultData) {
    vaultData = params.vaultData;
    if (['vault-create', 'vault-read', 'group-delete'].includes(params.type)) {
      vaultData.groupSelected = null;
      vaultData.recordSelected = null;
      recordArea.innerHTML = '';
    }
    group.listGroups({ vaultData, saving });

    if (params.type === 'vault-read' && pendingGlobalTarget) {
      const target = pendingGlobalTarget;
      pendingGlobalTarget = null;
      if (target.type === 'wallet' || target.type === 'asset') {
        const groupIndex = Number(target.walletIndex);
        if (Number.isInteger(groupIndex) && vaultData.groups && vaultData.groups[groupIndex]) {
          vaultData.groupSelected = groupIndex;
          const selectedGroup = vaultData.groups[groupIndex];
          group.listGroups({ vaultData, saving });
          record.listRecords({ vaultData, saving });
          if (target.type === 'asset') {
            const recordIndex = Number(target.recordIndex);
            if (Number.isInteger(recordIndex) && selectedGroup.records && selectedGroup.records[recordIndex]) {
              vaultData.recordSelected = recordIndex;
              record.listRecords({ vaultData, saving });
              record.showRecordDetail({ vaultData, record: selectedGroup.records[recordIndex], saving });
            } else group.showGroupDetail({ vaultData, group: selectedGroup, saving });
          } else group.showGroupDetail({ vaultData, group: selectedGroup, saving });
        }
      }
    }

    if (params.type === 'group-create' || params.type === 'group-modify') {
      if (params.type === 'group-create') recordArea.innerHTML = '';
      if (vaultData.groupSelected != null) {
        const selected = vaultData.groups[vaultData.groupSelected];
        if (selected) group.showGroupDetail({ vaultData, group: selected, saving });
      }
    }

    if (params.type === 'record' && vaultData.groupSelected != null) {
      const selectedGroup = vaultData.groups[vaultData.groupSelected];
      if (selectedGroup && Array.isArray(selectedGroup.records)) {
        record.listRecords({ vaultData, saving });
        if (vaultData.recordSelected != null) {
          const selectedRecord = selectedGroup.records[vaultData.recordSelected];
          if (selectedRecord) record.showRecordDetail({ vaultData, record: selectedRecord, saving });
        }
      }
    }
  }
});

const initSystem = () => ipc.send('init-system');

ipc.on('result-init-system', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) {
    applySettings(params.settings);
    if (settings.lockLogin) {
      const unlockAt = settings.lockLoginTime + (settings.minutesToWaitBetweenLockout * 60000);
      if (unlockAt > Date.now()) {
        showLockScreen();
        return;
      }
    }
  }
  showLogin();
});

ipc.on('result-rotate-crypto', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.status === 'SUCCESS') {
    sessionUnlocked = params.sessionUnlocked === true;
    if (params.vaultList) vaultList = params.vaultList;
    if (vaultList) profile.listProfiles(profileParams());
    showAfterLogin();
  } else {
    const editBtn = document.getElementById('encryptionEditBtn');
    if (editBtn) editBtn.disabled = false;
  }
});

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
  sessionUnlocked = false;
  pendingGlobalTarget = null;
  globalSearchUi.close();
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Welcome to SafeLedger';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());
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
    'Must contain at least one number and one lowercase letter.',
    'Must contain at least one uppercase letter.'
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
};

ipc.on('show-settings', () => {
  if (!sessionUnlocked || !settings) return;
  clearUtilitySelections();
  settingsUi.show({ settings, saving });
});

ipc.on('result-save-settings', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) applySettings(params.settings);
  if (settings && sessionUnlocked) settingsUi.show({ settings, saving });
});

const showLockScreen = () => {
  sessionUnlocked = false;
  pendingGlobalTarget = null;
  globalSearchUi.close();
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = `Account is locked for ${settings.minutesToWaitBetweenLockout} minutes.`;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const retry = document.createElement('p');
  const unlockAt = new Date(settings.lockLoginTime + (settings.minutesToWaitBetweenLockout * 60000));
  retry.textContent = `Try again after ${unlockAt}`;
  area.appendChild(retry);
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'saveBtn';
  button.className = 'btn btn-default bottom-space pull-right';
  button.innerHTML = '<span class="fa fa-unlock" aria-hidden="true"></span> Retry Login';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    const unlockTime = settings.lockLoginTime + (settings.minutesToWaitBetweenLockout * 60000);
    if (settings.lockLogin && unlockTime > Date.now()) alert('Lock timeout is still active');
    else showLogin();
  });
  area.appendChild(button);
};

ipc.on('result-lockout-destroy', (_event, params) => {
  saving.state = false;
  sessionUnlocked = false;
  pendingGlobalTarget = null;
  globalSearchUi.close();
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) applySettings(params.settings);
  showLockoutDestroy();
});

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
    if (!saving.state) showLogin();
  });
  area.appendChild(button);
};

exports._test = { navigateGlobalResult, applySettings };
