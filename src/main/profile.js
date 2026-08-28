'use strict';

const { ipcRenderer: ipc } = require('electron');
const status = require('./status');
const detailActions = require('./detail-actions');
const editFormUi = require('./edit-form-ui');
const securityUi = require('./security-ui');
const recoveryBinderUi = require('./recovery-binder-ui');

const normalize = (value) => String(value || '').trim().toLowerCase();

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

function listProfiles(params) {
  const area = document.getElementById('vaultArea');
  const search = document.getElementById('profileSearch');
  area.innerHTML = '';

  const vaults = params.vaultList && Array.isArray(params.vaultList.vaults)
    ? params.vaultList.vaults
    : [];
  if (!vaults.length) {
    area.textContent = 'No items';
    return;
  }

  const query = normalize(search && search.value);
  const ul = document.createElement('ul');
  ul.className = 'nav';

  vaults.forEach((item, index) => {
    if (query && !normalize(item && item.name).includes(query)) return;

    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (params.saving.state) return alert('Please wait for processing to complete');
      params.saving.state = true;
      status.loadStatus();
      params.vaultList.vaultSelected = index;
      showProfileDetail({ vaultList: params.vaultList, profile: item, saving: params.saving });
      listProfiles(params);
      ipc.send('read', { type: 'vault-read', file: item.file });
    });

    const badge = document.createElement('div');
    badge.className = params.vaultList.vaultSelected === index ? 'badge-circle badge-selected' : 'badge-circle';
    const initial = document.createElement('div');
    initial.className = 'text-center';
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

  area.appendChild(ul);
}

function createEditProfile(params) {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const profile = params.profile || null;

  const header = document.createElement('h1');
  header.textContent = profile ? 'Modify Profile' : 'Add Profile';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const { form, grid } = editFormUi.createForm(area);
  const inputName = editFormUi.addTextInput(grid, {
    id: 'inputName',
    label: 'Name',
    value: profile && profile.name,
    maxLength: 25
  });

  const saveProfile = (button) => {
    if (params.saving.state) return alert('Please wait for processing to complete');
    const name = String(inputName.value || '').trim();
    if (!name) {
      if (button) button.disabled = false;
      return;
    }
    if (button) button.disabled = true;

    const nextProfile = profile || { created: Date() };
    nextProfile.name = name;
    if (profile) nextProfile.modified = Date();

    params.saving.state = true;
    status.loadStatus();
    ipc.send('process-vault-list', {
      action: profile ? 'modify' : 'create',
      vault: nextProfile,
      vaultList: params.vaultList
    });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProfile(null);
  });
  detailActions.set([
    { icon: 'fa-save', title: 'Save profile', className: 'detail-action-save', onClick: (_event, button) => saveProfile(button) }
  ]);
}

function showProfileDetail(params) {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const profile = params.profile;

  const header = document.createElement('h1');
  header.textContent = profile.name || 'Profile';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  appendDateLine(area, 'Created', profile.created);
  appendDateLine(area, 'Modified', profile.modified);
  appendDateLine(area, 'Location', profile.path);

  detailActions.set([
    { icon: 'fa-pencil', title: 'Edit profile', onClick: () => createEditProfile(params) },
    {
      icon: 'fa-print', title: 'Print profile', className: 'detail-action-print',
      onClick: () => securityUi.printRecoverySheet(`${profile.name || 'Profile'} Profile`, [
        { label: 'Profile', value: profile.name },
        { label: 'Created', value: profile.created },
        { label: 'Modified', value: profile.modified },
        { label: 'Location', value: profile.path }
      ], false)
    },
    {
      icon: 'fa-book',
      title: 'Recovery binder',
      className: 'detail-action-binder',
      onClick: () => recoveryBinderUi.show({
        profile,
        onCancel: () => showProfileDetail(params)
      })
    },
    { icon: 'fa-trash', title: 'Delete profile', className: 'detail-action-delete', onClick: () => confirmDelete(params) }
  ]);
}

function confirmDelete(params) {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const profile = params.profile;

  const header = document.createElement('h1');
  header.textContent = `Confirm delete of profile: ${profile.name || 'Profile'}`;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const note = document.createElement('p');
  note.textContent = 'Use the red trash icon below to permanently delete this profile and its encrypted vault file.';
  area.appendChild(note);

  detailActions.set([
    { icon: 'fa-times', title: 'Cancel delete profile', className: 'detail-action-cancel', onClick: () => showProfileDetail(params) },
    {
      icon: 'fa-trash', title: 'Confirm delete profile', className: 'detail-action-delete',
      onClick: () => {
        const index = params.vaultList.vaultSelected;
        if (index == null || index < 0) return;
        params.vaultList.vaults.splice(index, 1);
        params.vaultList.vaultSelected = null;
        params.saving.state = true;
        status.loadStatus();
        ipc.send('vault-list-delete', {
          action: 'delete',
          vaultList: params.vaultList,
          fileName: profile.file
        });
        area.innerHTML = '';
        detailActions.clear();
      }
    }
  ]);
}

exports.listProfiles = listProfiles;
exports.createProfile = (params) => createEditProfile(params);
exports.showProfileDetail = showProfileDetail;
exports._test = { normalize, appendDateLine };
