'use strict';

// SafeLedger trusted UI module. This file is loaded by preload.js in the
// isolated preload world; the HTML page itself does not receive Node.js APIs.

const { ipcRenderer: ipc } = require('electron');
const group = require('./group');
const record = require('./record');
const status = require('./status');
const encryption = require('./encryption');

let vaultData;
let vaultList;
let sessionUnlocked = false;
const saving = { state: false };
let settings;

function requireUnlocked(action) {
  if (!sessionUnlocked) {
    status.showStatus({ status: 'ERROR', statusMsg: 'Please login.' });
    return false;
  }
  action();
  return true;
}

window.addEventListener('DOMContentLoaded', () => {
  const addVault = document.getElementById('addVault');
  const addGroup = document.getElementById('addGroup');
  const addRecord = document.getElementById('addRecord');
  const groupSearch = document.getElementById('groupSearch');
  const recordSearch = document.getElementById('recordSearch');
  const encryptionSettings = document.getElementById('encryptionSettings');

  initSystem();

  addVault.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (vaultList) createEditVault();
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

  groupSearch.addEventListener('keyup', (event) => {
    event.preventDefault();
    group.listGroups({ vaultData, saving });
  });

  recordSearch.addEventListener('keyup', (event) => {
    event.preventDefault();
    record.listRecords({ vaultData, saving });
  });

  encryptionSettings.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    requireUnlocked(() => {
      if (vaultList) {
        vaultList.vaultSelected = null;
        listVaults(vaultList.vaults);
      }
      if (vaultData) {
        vaultData.groupSelected = null;
        vaultData.recordSelected = null;
        document.getElementById('groupArea').innerHTML = '';
        document.getElementById('recordArea').innerHTML = '';
      }
      encryption.showEncrptionDetail({ vaultList, saving });
    });
  });
});

ipc.on('result', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.sessionUnlocked === true) sessionUnlocked = true;
  if (params.type === 'session-locked') sessionUnlocked = false;

  if (params.settings) {
    settings = params.settings;
    if (settings.lockLogin) {
      const unlockAt = settings.lockLoginTime + (settings.minutesToWaitBetweenLockout * 60000);
      if (unlockAt > Date.now()) {
        sessionUnlocked = false;
        showLockScreen();
        return;
      }
    }
  }

  if (params.type === 'vault-delete') {
    vaultList.vaultSelected = null;
    document.getElementById('groupArea').innerHTML = '';
    listVaults(vaultList.vaults);
  }

  const recordArea = document.getElementById('recordArea');
  if (params.vaultList) {
    if (params.type === 'vaultlist-init') {
      sessionUnlocked = true;
      params.vaultList.vaultSelected = null;
    }
    vaultList = params.vaultList;
    listVaults(vaultList.vaults);
    if (params.type === 'vault-create') {
      document.getElementById('groupArea').innerHTML = '';
      recordArea.innerHTML = '';
    }
    if (vaultList.vaultSelected != null) showVaultDetail(vaultList.vaults[vaultList.vaultSelected]);
    else showAfterLogin();
  }

  if (params.vaultData) {
    vaultData = params.vaultData;
    if (['vault-create', 'vault-read', 'group-delete'].includes(params.type)) {
      vaultData.groupSelected = null;
      vaultData.recordSelected = null;
      recordArea.innerHTML = '';
    }
    group.listGroups({ vaultData, saving });

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
    settings = params.settings;
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

const listVaults = (vaults) => {
  const vaultArea = document.getElementById('vaultArea');
  vaultArea.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'nav';

  if (!vaults) {
    vaultArea.textContent = 'No items';
    return;
  }

  vaults.forEach((item, index) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (saving.state) return alert('Please wait for processing to complete');
      if (!sessionUnlocked) return status.showStatus({ status: 'ERROR', statusMsg: 'Please login.' });
      saving.state = true;
      status.loadStatus();
      vaultList.vaultSelected = index;
      showVaultDetail(item);
      listVaults(vaultList.vaults);
      ipc.send('read', { type: 'vault-read', file: item.file });
    });

    const badge = document.createElement('div');
    badge.className = vaultList.vaultSelected === index ? 'badge-circle badge-selected' : 'badge-circle';
    badge.style.display = 'inline-block';
    const initial = document.createElement('div');
    initial.className = 'text-center';
    initial.style.marginTop = vaultList.vaultSelected === index ? '2px' : '4px';
    initial.style.fontSize = '25px';
    initial.textContent = String(item.name || '').charAt(0).toUpperCase();
    badge.appendChild(initial);
    link.appendChild(badge);

    const labelWrap = document.createElement('div');
    labelWrap.style.display = 'inline-block';
    const label = document.createElement('div');
    label.style.marginTop = '10px';
    label.style.marginLeft = '10px';
    label.textContent = item.name || '';
    labelWrap.appendChild(label);
    link.appendChild(labelWrap);
    li.appendChild(link);
    ul.appendChild(li);
  });
  vaultArea.appendChild(ul);
};

ipc.on('result-rotate-crypto', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.status === 'SUCCESS') {
    sessionUnlocked = params.sessionUnlocked === true;
    if (params.vaultList) vaultList = params.vaultList;
    if (vaultList) listVaults(vaultList.vaults);
    showAfterLogin();
  } else {
    const editBtn = document.getElementById('encryptionEditBtn');
    if (editBtn) editBtn.disabled = false;
  }
});

const createEditVault = (profile) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = profile ? 'Modify Profile' : 'Add Profile';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());
  area.appendChild(form);
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group';
  form.appendChild(formGroup);
  const label = document.createElement('label');
  label.htmlFor = 'inputName';
  label.textContent = 'Name';
  formGroup.appendChild(label);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control';
  input.id = 'inputName';
  input.maxLength = 25;
  input.value = profile ? profile.name || '' : '';
  formGroup.appendChild(input);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.id = 'saveBtn';
  saveBtn.className = 'btn btn-default bottom-space pull-right';
  saveBtn.innerHTML = '<span class="glyphicon glyphicon-save" aria-hidden="true"></span> Save';
  saveBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    if (!input.value) return;
    saveBtn.disabled = true;
    let nextProfile = profile;
    if (nextProfile) {
      nextProfile.name = input.value;
      nextProfile.modified = Date();
    } else {
      nextProfile = { name: input.value, created: Date() };
    }
    saving.state = true;
    status.loadStatus();
    ipc.send('process-vault-list', {
      action: profile ? 'modify' : 'create',
      vault: nextProfile,
      vaultList
    });
  });
  form.appendChild(saveBtn);
};

function appendDateLine(area, label, value) {
  if (value == null || value === '') return;
  const p = document.createElement('p');
  p.className = 'dates';
  const strong = document.createElement('b');
  strong.textContent = `${label}: `;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(String(value)));
  area.appendChild(p);
}

const showVaultDetail = (profile) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = profile.name || 'Profile';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  appendDateLine(area, 'Created', profile.created);
  appendDateLine(area, 'Modified', profile.modified);
  appendDateLine(area, 'Location', profile.path);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.id = 'deleteBtn';
  deleteBtn.className = 'btn btn-default bottom-space pull-right';
  deleteBtn.innerHTML = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span> Delete';
  deleteBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    deleteBtn.disabled = true;
    confirmDelete({ vault: profile });
  });
  area.appendChild(deleteBtn);

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.id = 'editBtn';
  editBtn.className = 'btn btn-default bottom-space pull-right';
  editBtn.innerHTML = '<span class="glyphicon glyphicon-edit" aria-hidden="true"></span> Edit';
  editBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    editBtn.disabled = true;
    createEditVault(profile);
  });
  area.appendChild(editBtn);
};

const confirmDelete = (params) => {
  const vaultFilename = params.vault.file;
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = `Confirm delete of profile: ${params.vault.name}`;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.id = 'deleteBtn';
  deleteBtn.className = 'btn btn-default bottom-space pull-right';
  deleteBtn.innerHTML = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span> Confirm';
  deleteBtn.addEventListener('click', (event) => {
    event.preventDefault();
    deleteBtn.disabled = true;
    vaultList.vaults.splice(vaultList.vaultSelected, 1);
    vaultList.vaultSelected = null;
    saving.state = true;
    status.loadStatus();
    ipc.send('vault-list-delete', { action: 'delete', vaultList, fileName: vaultFilename });
    area.innerHTML = '';
  });
  area.appendChild(deleteBtn);
};

const showAfterLogin = () => {
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
  if (!sessionUnlocked) return;
  if (vaultList) {
    vaultList.vaultSelected = null;
    listVaults(vaultList.vaults);
  }
  if (vaultData) {
    vaultData.groupSelected = null;
    vaultData.recordSelected = null;
    document.getElementById('groupArea').innerHTML = '';
    document.getElementById('recordArea').innerHTML = '';
  }
  showSettings();
});

ipc.on('result-save-settings', (_event, params) => {
  saving.state = false;
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) settings = params.settings;
  showSettings();
});

const showSettings = () => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Settings';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());
  area.appendChild(form);
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group';
  form.appendChild(formGroup);

  const makeNumber = (id, labelText, value) => {
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    formGroup.appendChild(label);
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control';
    input.id = id;
    input.value = value;
    formGroup.appendChild(input);
    return input;
  };

  const inputFailAttempts = makeNumber('inputFailAttempts', 'Consecutive login failure attempts per lockout', settings.numFailAttempts);
  const inputLockoutRetry = makeNumber('inputLockoutRetry', 'Consecutive lockout attempts', settings.numLockoutRetries);
  const inputBetweenLockout = makeNumber('inputBetweenLockout', 'Minutes to wait between lockouts', settings.minutesToWaitBetweenLockout);

  const warningGroup = document.createElement('div');
  warningGroup.className = 'form-group';
  const warning = document.createElement('label');
  warning.textContent = 'Brute force attack interception can destroy encrypted data after all configured lockouts are exhausted.';
  warningGroup.appendChild(warning);
  form.appendChild(warningGroup);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.id = 'saveBtn';
  saveBtn.className = 'btn btn-default bottom-space pull-right';
  saveBtn.innerHTML = '<span class="glyphicon glyphicon-save" aria-hidden="true"></span> Save';
  saveBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (saving.state) return alert('Please wait for processing to complete');
    const clamp = (value, fallback) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(99, Math.max(1, parsed));
    };
    saveBtn.disabled = true;
    saving.state = true;
    status.loadStatus();
    ipc.send('save-settings', {
      newSettings: Object.assign({}, settings, {
        modified: Date(),
        numFailAttempts: clamp(inputFailAttempts.value, settings.numFailAttempts),
        numLockoutRetries: clamp(inputLockoutRetry.value, settings.numLockoutRetries),
        minutesToWaitBetweenLockout: clamp(inputBetweenLockout.value, settings.minutesToWaitBetweenLockout)
      })
    });
  });
  form.appendChild(saveBtn);
  appendDateLine(area, 'Modified', settings.modified);
};

const showLockScreen = () => {
  sessionUnlocked = false;
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
  if (params.status) status.showStatus({ status: params.status, statusMsg: params.statusMsg });
  if (params.settings) settings = params.settings;
  showLockoutDestroy();
});

const showLockoutDestroy = () => {
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
