'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const status = require('./status');
const detailActions = require('./detail-actions');
const editFormUi = require('./edit-form-ui');
const securityUi = require('./security-ui');
const recoveryBinderUi = require('./recovery-binder-ui');
const emptyState = require('./empty-state-ui');
const profileSetup = require('./profile-setup');

const normalize = (value) => String(value || '').trim().toLowerCase();

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short', month: 'short', day: '2-digit', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      timeZoneName: 'short'
    }).format(date);
  } catch (_) {
    return String(value);
  }
}

function appendDateLine(area, label, value) {
  if (value == null || value === '') return;
  const p = document.createElement('p');
  p.className = 'detail-info-line';
  const strong = document.createElement('b');
  strong.textContent = `${label}: `;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(formatDate(value)));
  area.appendChild(p);
}

function pinnedSort(a, b) {
  const aPinned = a.item && a.item.pinned === true;
  const bPinned = b.item && b.item.pinned === true;
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return normalize(a.item && a.item.name).localeCompare(normalize(b.item && b.item.name));
}

function listProfiles(params) {
  const area = document.getElementById('vaultArea');
  const search = document.getElementById('profileSearch');
  area.innerHTML = '';

  const vaults = params.vaultList && Array.isArray(params.vaultList.vaults)
    ? params.vaultList.vaults
    : [];
  if (!vaults.length) {
    emptyState.renderColumn(area, {
      icon: 'fa-folder-open-o',
      title: 'No profiles yet',
      text: 'Create a Profile to organize vault items, assets, and recovery plans.'
    });
    return;
  }

  const query = normalize(search && search.value);
  const ul = document.createElement('ul');
  ul.className = 'nav';
  let visibleCount = 0;

  vaults.map((item, index) => ({ item, index })).sort(pinnedSort).forEach(({ item, index }) => {
    if (query && !normalize(item && item.name).includes(query)) return;
    visibleCount++;

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

    const row = document.createElement('span');
    row.className = 'profile-list-row';
    const badge = document.createElement('span');
    badge.className = params.vaultList.vaultSelected === index ? 'badge-circle badge-selected' : 'badge-circle';
    const initial = document.createElement('span');
    initial.className = 'profile-list-initial';
    initial.textContent = String(item.name || '').charAt(0).toUpperCase();
    badge.appendChild(initial);
    row.appendChild(badge);
    const label = document.createElement('span');
    label.className = 'profile-list-name';
    label.textContent = item.name || 'Unnamed Profile';
    row.appendChild(label);
    if (item.pinned === true) {
      const pin = document.createElement('i');
      pin.className = 'fa fa-star pin-indicator';
      pin.setAttribute('title', 'Pinned');
      pin.setAttribute('aria-label', 'Pinned');
      row.appendChild(pin);
    }
    link.appendChild(row);
    li.appendChild(link);
    ul.appendChild(li);
  });

  if (!visibleCount) {
    emptyState.renderColumn(area, {
      icon: 'fa-search',
      title: 'No matching profiles',
      text: 'Try a different search term.'
    });
    return;
  }
  area.appendChild(ul);
}

function createProfileSetupControls(grid) {
  const templates = profileSetup.availableTemplates();
  const section = document.createElement('fieldset');
  section.className = 'edit-info-grid-full profile-setup-section';

  const legend = document.createElement('legend');
  legend.textContent = 'Starting setup';
  section.appendChild(legend);

  const intro = document.createElement('p');
  intro.className = 'profile-setup-intro';
  intro.textContent = 'Choose whether this Profile starts empty or with wallet templates. Templates only add wallet names and their standard supported assets/networks; you add your private recovery information yourself.';
  section.appendChild(intro);

  const choices = document.createElement('div');
  choices.className = 'profile-setup-choices';

  const makeChoice = (value, titleText, description, checked) => {
    const label = document.createElement('label');
    label.className = 'profile-setup-choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'profileSetupMode';
    input.value = value;
    input.checked = checked;
    const copy = document.createElement('span');
    copy.className = 'profile-setup-choice-copy';
    const title = document.createElement('strong');
    title.textContent = titleText;
    const detail = document.createElement('span');
    detail.textContent = description;
    copy.appendChild(title);
    copy.appendChild(detail);
    label.appendChild(input);
    label.appendChild(copy);
    choices.appendChild(label);
    return input;
  };

  const templateMode = makeChoice(
    'templates',
    'Standard setup',
    'Choose the wallets you use. Each selected wallet loads with its standard supported coins and networks.',
    true
  );
  const blankMode = makeChoice(
    'blank',
    'Blank Profile',
    'Start with no wallets or assets and build the Profile manually.',
    false
  );
  section.appendChild(choices);

  const picker = document.createElement('div');
  picker.className = 'profile-wallet-picker';

  const pickerHeader = document.createElement('div');
  pickerHeader.className = 'profile-wallet-picker-header';
  const pickerTitle = document.createElement('strong');
  pickerTitle.textContent = 'Select wallet templates';
  const count = document.createElement('span');
  count.className = 'profile-wallet-selection-count';
  pickerHeader.appendChild(pickerTitle);
  pickerHeader.appendChild(count);
  picker.appendChild(pickerHeader);

  const toolbar = document.createElement('div');
  toolbar.className = 'profile-wallet-picker-toolbar';
  const standardButton = document.createElement('button');
  standardButton.type = 'button';
  standardButton.className = 'btn btn-default btn-sm';
  standardButton.textContent = 'Select standard';
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'btn btn-default btn-sm';
  clearButton.textContent = 'Clear all';
  toolbar.appendChild(standardButton);
  toolbar.appendChild(clearButton);
  picker.appendChild(toolbar);

  const templateGrid = document.createElement('div');
  templateGrid.className = 'profile-wallet-template-grid';
  const checkboxes = [];

  for (const template of templates) {
    const label = document.createElement('label');
    label.className = 'profile-wallet-template';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = template.name;
    checkbox.checked = template.standard === true;
    const copy = document.createElement('span');
    copy.className = 'profile-wallet-template-copy';
    const name = document.createElement('strong');
    name.textContent = template.name;
    const type = document.createElement('span');
    type.textContent = template.type ? `${template.type} Wallet` : 'Wallet';
    copy.appendChild(name);
    copy.appendChild(type);
    label.appendChild(checkbox);
    label.appendChild(copy);
    templateGrid.appendChild(label);
    checkboxes.push({ checkbox, template });
  }
  picker.appendChild(templateGrid);
  section.appendChild(picker);
  grid.appendChild(section);

  const updateCount = () => {
    const selected = checkboxes.filter(({ checkbox }) => checkbox.checked).length;
    count.textContent = `${selected} selected`;
  };

  const applyMode = () => {
    picker.hidden = blankMode.checked;
    updateCount();
  };

  for (const { checkbox } of checkboxes) checkbox.addEventListener('change', updateCount);
  templateMode.addEventListener('change', applyMode);
  blankMode.addEventListener('change', applyMode);
  standardButton.addEventListener('click', () => {
    for (const { checkbox, template } of checkboxes) checkbox.checked = template.standard === true;
    updateCount();
  });
  clearButton.addEventListener('click', () => {
    for (const { checkbox } of checkboxes) checkbox.checked = false;
    updateCount();
  });
  applyMode();

  return {
    getSetup() {
      if (blankMode.checked) return { mode: 'blank', walletNames: [] };
      return {
        mode: 'templates',
        walletNames: checkboxes.filter(({ checkbox }) => checkbox.checked).map(({ template }) => template.name)
      };
    }
  };
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
  const inputNotes = editFormUi.addTextarea(grid, {
    id: 'inputProfileNotes',
    label: 'Notes',
    value: profile && profile.notes,
    rows: 4,
    maxLength: 500,
    className: 'detail-notes-input',
    full: true
  });
  const setupControls = profile ? null : createProfileSetupControls(grid);

  const saveProfile = (button) => {
    if (params.saving.state) return alert('Please wait for processing to complete');
    const name = String(inputName.value || '').trim();
    if (!name) {
      if (button) button.disabled = false;
      return;
    }

    const selectedSetup = setupControls ? setupControls.getSetup() : null;
    if (selectedSetup && selectedSetup.mode === 'templates' && !selectedSetup.walletNames.length) {
      if (button) button.disabled = false;
      return alert('Choose at least one wallet template or select Blank Profile.');
    }
    if (button) button.disabled = true;

    const nextProfile = profile || { created: Date() };
    nextProfile.name = name;
    nextProfile.notes = inputNotes.value;
    if (profile) nextProfile.modified = Date();

    params.saving.state = true;
    status.loadStatus();
    const payload = {
      action: profile ? 'modify' : 'create',
      vault: nextProfile,
      vaultList: params.vaultList
    };
    if (!profile) payload.profileSetup = selectedSetup;
    ipc.send('process-vault-list', payload);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveProfile(null);
  });
  const actions = [];
  if (!profile && typeof params.onCancel === 'function') {
    actions.push({
      icon: 'fa-times',
      title: 'Cancel new profile',
      className: 'detail-action-cancel',
      onClick: params.onCancel
    });
  }
  actions.push({ icon: 'fa-save', title: 'Save profile', className: 'detail-action-save', onClick: (_event, button) => saveProfile(button) });
  detailActions.set(actions);
}

function togglePinned(params, button) {
  if (params.saving.state) return alert('Please wait for processing to complete');
  params.profile.pinned = params.profile.pinned !== true;
  params.profile.modified = Date();
  params.saving.state = true;
  if (button) button.disabled = true;
  status.loadStatus();
  ipc.send('process-vault-list', {
    action: 'modify',
    vault: params.profile,
    vaultList: params.vaultList
  });
}

function appendProfileNotes(area, profile) {
  const notesWrap = document.createElement('div');
  notesWrap.className = 'detail-notes-section profile-notes-section';
  const label = document.createElement('b');
  label.textContent = 'Notes:';
  notesWrap.appendChild(label);
  const value = document.createElement('div');
  value.className = 'outData detail-notes-value profile-notes-value';
  value.textContent = String(profile && profile.notes || '').trim() || 'Use Edit Profile to add notes.';
  notesWrap.appendChild(value);
  area.appendChild(notesWrap);
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
  if (profile.path) {
    const location = document.createElement('p');
    location.className = 'detail-info-line';
    const strong = document.createElement('b');
    strong.textContent = 'Location: ';
    location.appendChild(strong);
    location.appendChild(document.createTextNode(String(profile.path)));
    area.appendChild(location);
  }
  appendProfileNotes(area, profile);

  detailActions.set([
    {
      icon: profile.pinned === true ? 'fa-star' : 'fa-star-o',
      title: profile.pinned === true ? 'Unpin profile' : 'Pin profile',
      className: 'detail-action-pin',
      onClick: (_event, button) => togglePinned(params, button)
    },
    { icon: 'fa-pencil', title: 'Edit profile', onClick: () => createEditProfile(params) },
    {
      icon: 'fa-print', title: 'Print profile', className: 'detail-action-print',
      onClick: () => securityUi.printRecoverySheet(`${profile.name || 'Profile'} Profile`, [
        { label: 'Profile', value: profile.name },
        { label: 'Created', value: formatDate(profile.created) },
        { label: 'Modified', value: formatDate(profile.modified) },
        { label: 'Location', value: profile.path },
        { label: 'Notes', value: profile.notes }
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
exports._test = { normalize, appendDateLine, appendProfileNotes, formatDate, pinnedSort, createProfileSetupControls };
